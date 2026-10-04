import {
  ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChildren
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { FiguraProducto } from '../../compartidos/figura-producto/figura-producto';
import { etiquetaRol } from '../../modelos/roles';
import { CORREO_CONTACTO_AYUDA } from '../../utilidades/ayuda';
import {
  ANCLAS_HOME, CAPTURAS_PRODUCTO, CapturaId, FUNCIONES, FUNCIONES_PRINCIPALES, PUNTOS_TRINY,
  ROLES_HOME, TITULO_PAGINA_HOME, capturaPorId, haySesionActiva
} from '../../utilidades/home';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, FiguraProducto],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {

  readonly anclas = ANCLAS_HOME;
  readonly capturas = CAPTURAS_PRODUCTO;
  readonly funcionesPrincipales = FUNCIONES_PRINCIPALES;
  readonly funciones = FUNCIONES;
  readonly puntosTriny = PUNTOS_TRINY;
  readonly correoContacto = CORREO_CONTACTO_AYUDA;
  readonly roles = ROLES_HOME.map(rol => ({ nombre: etiquetaRol(rol.codigo), descripcion: rol.descripcion }));
  readonly capturaTriny = capturaPorId('triny');

  // El botón principal depende de si ya hay sesión (misma clave que el authGuard).
  readonly sesion = signal(haySesionActiva());
  readonly textoAcceso = computed(() => (this.sesion() ? 'Ir a mi panel' : 'Iniciar sesión'));
  readonly rutaAcceso = computed(() => (this.sesion() ? '/inicio' : '/login'));

  readonly pestanaActiva = signal<CapturaId>('dashboard');
  readonly captura = computed(() => capturaPorId(this.pestanaActiva()));
  // True solo si la imagen de la pestaña activa cargó de verdad (con marcador de posición no se muestra la línea).
  readonly capturaReal = signal(false);

  private botonesPestana = viewChildren<ElementRef<HTMLButtonElement>>('pestana');

  constructor() {
    inject(Title).setTitle(TITULO_PAGINA_HOME);
  }

  seleccionarPestana(id: CapturaId): void {
    if (id !== this.pestanaActiva()) {
      this.capturaReal.set(false);
      this.pestanaActiva.set(id);
    }
  }

  alTeclearPestana(evento: KeyboardEvent): void {
    const total = this.capturas.length;
    const actual = this.capturas.findIndex(captura => captura.id === this.pestanaActiva());
    let destino: number;
    switch (evento.key) {
      case 'ArrowRight': destino = (actual + 1) % total; break;
      case 'ArrowLeft': destino = (actual - 1 + total) % total; break;
      case 'Home': destino = 0; break;
      case 'End': destino = total - 1; break;
      default: return;
    }
    evento.preventDefault();
    this.seleccionarPestana(this.capturas[destino].id);
    this.botonesPestana()[destino]?.nativeElement.focus();
  }

}
