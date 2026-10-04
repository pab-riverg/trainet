import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, debounceTime, map, of, switchMap, tap } from 'rxjs';
import { GrupoBusqueda, ResultadoBusqueda } from '../../modelos/busqueda';
import { BusquedaService } from '../../servicios/busqueda';
import { SegmentoTexto, segmentosResaltados } from '../../utilidades/busqueda';
import { mensajeError } from '../../utilidades/errores';
import { rutaDeBusquedaSegura } from '../../utilidades/rutas';
import { EstadoBadge } from '../../compartidos/estado-badge/estado-badge';

const MIN_CARACTERES = 2;
const MAX_CARACTERES = 60;
const ESPERA_MS = 300;

type EstadoBusqueda = 'inactivo' | 'cargando' | 'listo' | 'error';

interface ItemVista {
  id: string;
  indice: number;
  resultado: ResultadoBusqueda;
  titulo: SegmentoTexto[];
}

interface GrupoVista {
  idTitulo: string;
  titulo: string;
  icono: string;
  items: ItemVista[];
}

/**
 * Buscador global de la barra superior. Consulta GET /api/buscar/ (solo módulos visibles para el rol) y muestra los
 * resultados agrupados por módulo en un panel con patrón combobox/listbox. Elegir un resultado lleva a la lista o
 * pestaña del módulo. Vive mientras exista la barra (sesión iniciada): al cerrar sesión se destruye y no deja
 * texto ni resultados para el siguiente usuario.
 */
@Component({
  selector: 'app-buscador-global',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, EstadoBadge],
  templateUrl: './buscador-global.html',
  styleUrl: './buscador-global.css',
  host: {
    '(document:click)': 'alHacerClickEnDocumento($event)'
  }
})
export class BuscadorGlobal {

  private busquedaService = inject(BusquedaService);
  private router = inject(Router);
  private elemento = inject(ElementRef<HTMLElement>);
  private injector = inject(Injector);

  private entrada = viewChild.required<ElementRef<HTMLInputElement>>('entrada');
  private botonAbrir = viewChild.required<ElementRef<HTMLButtonElement>>('botonAbrir');

  readonly maxCaracteres = MAX_CARACTERES;

  texto = new FormControl('', { nonNullable: true });

  // Texto ya recortado que se está buscando.
  consulta = signal('');
  estado = signal<EstadoBusqueda>('inactivo');
  grupos = signal<GrupoBusqueda[]>([]);
  mensajeError = signal<string | null>(null);
  abierto = signal(false);
  // Solo tiene efecto en < 768px (ver buscador-global.css): el campo está plegado a un icono hasta que se expande.
  expandido = signal(false);
  // Índice (entre todos los resultados) de la opción marcada con el teclado o el ratón; -1 = ninguna.
  activo = signal(-1);

  panelVisible = computed(() => this.abierto() && this.consulta().length >= MIN_CARACTERES);

  // Resultados con su índice global e id (para aria-activedescendant) y el título dividido para resaltar.
  vista = computed<GrupoVista[]>(() => {
    let indice = 0;
    return this.grupos().map((grupo, g) => ({
      idTitulo: `buscador-grupo-${g}`,
      titulo: grupo.titulo,
      icono: grupo.icono,
      items: grupo.resultados.map(resultado => {
        const item: ItemVista = {
          id: `buscador-opcion-${indice}`,
          indice,
          resultado,
          titulo: segmentosResaltados(resultado.titulo, this.consulta())
        };
        indice++;
        return item;
      })
    }));
  });

  private items = computed(() => this.vista().flatMap(grupo => grupo.items));
  idActivo = computed(() => this.items()[this.activo()]?.id ?? null);

  // Texto para lectores de pantalla (región aria-live).
  resumen = computed(() => {
    switch (this.estado()) {
      case 'cargando': return 'Buscando…';
      case 'error': return this.mensajeError() ?? 'No se pudo realizar la búsqueda.';
      case 'listo': {
        const total = this.items().length;
        return total === 0 ? `Sin resultados para «${this.consulta()}»` : `${total} ${total === 1 ? 'resultado' : 'resultados'}`;
      }
      default: return '';
    }
  });

  constructor() {
    // Cada texto nuevo cancela la petición anterior (switchMap); con menos de 2 caracteres no se consulta.
    this.texto.valueChanges
      .pipe(
        map(valor => valor.trim()),
        tap(valor => this.alEscribir(valor)),
        debounceTime(ESPERA_MS),
        switchMap(valor => valor.length < MIN_CARACTERES
          ? of(null)
          : this.busquedaService.buscar(valor).pipe(
              map(respuesta => ({ respuesta })),
              catchError((error: unknown) => of({ error }))
            )),
        takeUntilDestroyed()
      )
      .subscribe(resultado => {
        if (resultado === null) {
          this.reiniciar();
        } else if ('respuesta' in resultado) {
          this.grupos.set(resultado.respuesta.grupos);
          this.mensajeError.set(null);
          this.estado.set('listo');
        } else {
          this.grupos.set([]);
          this.mensajeError.set(this.textoDeError(resultado.error));
          this.estado.set('error');
        }
      });
  }

  private alEscribir(valor: string): void {
    this.consulta.set(valor);
    this.activo.set(-1);
    if (valor.length >= MIN_CARACTERES) {
      this.abierto.set(true);
      this.estado.set('cargando');
    } else {
      this.reiniciar();
    }
  }

  private reiniciar(): void {
    this.grupos.set([]);
    this.mensajeError.set(null);
    this.estado.set('inactivo');
    this.activo.set(-1);
  }

  private textoDeError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 429) {
      return 'Hiciste muchas búsquedas seguidas. Espera un momento e inténtalo de nuevo.';
    }
    return mensajeError(error, 'No se pudo realizar la búsqueda.');
  }

  alEnfocar(): void {
    if (this.consulta().length >= MIN_CARACTERES) {
      this.abierto.set(true);
    }
  }

  alHacerClickEnDocumento(evento: Event): void {
    if (this.elemento.nativeElement.contains(evento.target as Node)) {
      return;
    }
    this.abierto.set(false);
    this.expandido.set(false);
  }

  expandir(): void {
    this.expandido.set(true);
    afterNextRender(() => this.entrada().nativeElement.focus(), { injector: this.injector });
  }

  contraer(): void {
    this.expandido.set(false);
    this.cerrarYLimpiar();
    afterNextRender(() => this.botonAbrir().nativeElement.focus(), { injector: this.injector });
  }

  alTeclear(evento: KeyboardEvent): void {
    const total = this.items().length;
    switch (evento.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        evento.preventDefault();
        if (this.consulta().length < MIN_CARACTERES) {
          return;
        }
        this.abierto.set(true);
        if (total === 0) {
          return;
        }
        const paso = evento.key === 'ArrowDown' ? 1 : -1;
        this.activo.update(actual => (actual + paso + total) % total);
        break;
      }
      case 'Enter': {
        const item = this.items()[this.activo()] ?? (this.panelVisible() ? this.items()[0] : undefined);
        if (item) {
          evento.preventDefault();
          this.abrir(item.resultado);
        }
        break;
      }
      case 'Escape':
        if (this.expandido()) {
          this.contraer();
        } else {
          this.cerrarYLimpiar();
        }
        break;
      case 'Tab':
        this.abierto.set(false);
        break;
    }
  }

  marcar(indice: number): void {
    this.activo.set(indice);
  }

  // Lleva a la lista o pestaña del módulo. Solo se navega si la ruta tiene la forma esperada (módulo + vista + q).
  abrir(resultado: ResultadoBusqueda): void {
    if (!rutaDeBusquedaSegura(resultado.ruta)) {
      return;
    }
    void this.router.navigateByUrl(resultado.ruta);
    this.cerrarYLimpiar();
  }

  private cerrarYLimpiar(): void {
    this.abierto.set(false);
    this.texto.setValue('');
  }

}
