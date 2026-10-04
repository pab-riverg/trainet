import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, switchMap, timer } from 'rxjs';
import { BuscadorGlobal } from '../buscador-global/buscador-global';
import { CATALOGO_ROLES } from '../../modelos/roles';
import { Notificacion } from '../../modelos/notificaciones';
import { AdministracionService } from '../../servicios/administracion';
import { InicioService } from '../../servicios/inicio';
import { MenuLateral } from '../../servicios/menu-lateral';
import { NotificacionesService } from '../../servicios/notificaciones';
import { tiempoRelativo } from '../../utilidades/fechas';
import { mensajeError } from '../../utilidades/errores';
import { rutaDeModulo, rutaInternaSegura } from '../../utilidades/rutas';

const INTERVALO_SONDEO_MS = 30000;
const MAX_NOTIFICACIONES_PANEL = 10;

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BuscadorGlobal],
  templateUrl: './header.html',
  styleUrl: './header.css',
  host: {
    '(document:click)': 'alHacerClickEnDocumento($event)',
    '(document:keydown.escape)': 'cerrarPanel()'
  }
})
export class Header {

  private notificacionesService = inject(NotificacionesService);
  private elemento = inject(ElementRef<HTMLElement>);
  private administracion = inject(AdministracionService);
  private router = inject(Router);
  private inicio = inject(InicioService);
  protected menu = inject(MenuLateral);

  // Hamburguesa que abre el panel lateral en < 992px: recibe el foco al cerrarse el panel.
  private botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');

  // Nombre del equipo de trabajo (se actualiza al instante cuando el administrador lo cambia).
  nombreEquipo = this.administracion.nombreEquipo;

  private nombreGuardado = signal(localStorage.getItem('trainet_nombre'));
  private rolGuardado = signal(localStorage.getItem('trainet_rol'));

  tiempoRelativo = tiempoRelativo;

  panelAbierto = signal(false);
  noLeidas = signal(0);
  notificaciones = signal<Notificacion[]>([]);
  cargandoNotificaciones = signal(false);
  errorNotificaciones = signal<string | null>(null);
  marcandoTodas = signal(false);

  textoInsignia = computed(() => (this.noLeidas() > 9 ? '9+' : String(this.noLeidas())));

  primerNombre = computed(() => {
    const nombre = this.nombreGuardado()?.trim();
    return nombre ? nombre.split(/\s+/)[0] : 'Usuario';
  });

  etiquetaRol = computed(() => {
    const rol = this.rolGuardado();
    return CATALOGO_ROLES.find(opcion => opcion.codigo === rol)?.etiqueta ?? 'Usuario';
  });

  iniciales = computed(() => {
    const nombre = this.nombreGuardado()?.trim();
    if (!nombre) {
      return 'US';
    }

    const palabras = nombre.split(/\s+/).filter(Boolean);
    const primera = palabras[0]?.charAt(0) ?? '';
    const segunda = palabras.length > 1 ? palabras[1].charAt(0) : '';
    return (primera + segunda).toUpperCase() || 'US';
  });

  constructor() {
    // La barra solo existe con sesión iniciada: se carga al crearse (login o recarga) y se limpia al destruirse (logout).
    this.administracion.recargarNombreEquipo();
    inject(DestroyRef).onDestroy(() => this.administracion.limpiarNombreEquipo());

    // Al cerrarse el panel lateral (no al arrancar) el foco vuelve a la hamburguesa.
    let estabaAbierto = false;
    effect(() => {
      const abierto = this.menu.abierto();
      if (estabaAbierto && !abierto) {
        untracked(() => this.botonMenu()?.nativeElement.focus());
      }
      estabaAbierto = abierto;
    });

    // El catchError va dentro del switchMap para que un fallo puntual no mate el sondeo.
    timer(0, INTERVALO_SONDEO_MS)
      .pipe(
        switchMap(() => this.notificacionesService.contarNoLeidas().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed()
      )
      .subscribe({
        next: respuesta => this.noLeidas.set(respuesta.total),
        error: () => { /* el sondeo nunca debería llegar aquí; no se muestra nada */ }
      });
  }

  toggleSidebar(): void {
    this.menu.alternar();
  }

  alHacerClickEnDocumento(evento: Event): void {
    if (this.panelAbierto() && !this.elemento.nativeElement.querySelector('.notif-wrapper')?.contains(evento.target as Node)) {
      this.cerrarPanel();
    }
  }

  cerrarPanel(): void {
    this.panelAbierto.set(false);
  }

  alternarPanel(): void {
    if (this.panelAbierto()) {
      this.cerrarPanel();
      return;
    }
    this.panelAbierto.set(true);
    this.cargarNotificaciones();
  }

  private cargarNotificaciones(): void {
    this.cargandoNotificaciones.set(true);
    this.errorNotificaciones.set(null);

    this.notificacionesService.listar().subscribe({
      next: notificaciones => {
        this.notificaciones.set(notificaciones.slice(0, MAX_NOTIFICACIONES_PANEL));
        this.cargandoNotificaciones.set(false);
      },
      error: error => {
        this.errorNotificaciones.set(mensajeError(error, 'No se pudieron cargar las notificaciones.'));
        this.cargandoNotificaciones.set(false);
      }
    });
  }

  // Destino de la notificación (título del módulo) si su ruta es válida; null si no tiene destino.
  destinoDe(notificacion: Notificacion): string | null {
    if (!rutaInternaSegura(notificacion.ruta)) {
      return null;
    }
    const modulo = rutaDeModulo(notificacion.ruta);
    return this.inicio.modulos().find(item => item.ruta === modulo)?.titulo ?? 'el módulo';
  }

  // Clic en una notificación: la marca como leída y, si tiene destino, cierra el panel y navega a la lista o
  // pestaña del módulo (nunca a un detalle). Sin destino (antiguas) solo se marca y el panel sigue abierto.
  abrirNotificacion(notificacion: Notificacion): void {
    this.marcarLeida(notificacion);
    if (this.destinoDe(notificacion) === null) {
      return;
    }
    this.cerrarPanel();
    void this.router.navigateByUrl(notificacion.ruta);
  }

  marcarLeida(notificacion: Notificacion): void {
    if (notificacion.leida) {
      return;
    }

    this.errorNotificaciones.set(null);

    this.notificacionesService.marcarLeida(notificacion.id).subscribe({
      next: actualizada => {
        this.notificaciones.update(lista => lista.map(item => (item.id === actualizada.id ? actualizada : item)));
        this.noLeidas.update(total => Math.max(0, total - 1));
      },
      error: error => this.errorNotificaciones.set(mensajeError(error, 'No se pudo marcar la notificación como leída.'))
    });
  }

  marcarTodasLeidas(): void {
    this.marcandoTodas.set(true);
    this.errorNotificaciones.set(null);

    this.notificacionesService.marcarTodasLeidas().subscribe({
      next: () => {
        this.marcandoTodas.set(false);
        this.notificaciones.update(lista => lista.map(item => ({ ...item, leida: true })));
        this.noLeidas.set(0);
      },
      error: error => {
        this.marcandoTodas.set(false);
        this.errorNotificaciones.set(mensajeError(error, 'No se pudieron marcar las notificaciones como leídas.'));
      }
    });
  }

}
