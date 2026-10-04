import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, computed, inject, input, signal, viewChild, viewChildren } from '@angular/core';

/** Espacio libre mínimo bajo el botón para abrir el menú hacia abajo; si hay menos, se abre hacia arriba. */
const ESPACIO_MINIMO_ABAJO_PX = 200;

/** Opción del menú: texto visible y la acción que ya existe en la pantalla (la misma lógica de descarga de siempre). */
export interface OpcionDescarga {
  etiqueta: string;
  accion: () => void;
}

/**
 * Un único botón "Descargar" que despliega el menú de formatos. Menú propio con signals (sin JS de Bootstrap) para
 * controlar el foco: clic, Enter y Espacio abren; flechas, Inicio y Fin mueven; Escape cierra y devuelve el foco
 * al botón; el clic fuera, Tab o elegir una opción cierran. Mientras `cargando` el botón queda deshabilitado
 * y muestra "Descargando…": no se puede lanzar dos veces.
 */
@Component({
  selector: 'app-menu-descarga',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './menu-descarga.html',
  styleUrl: './menu-descarga.css',
  host: {
    '(document:click)': 'alHacerClickEnDocumento($event)'
  }
})
export class MenuDescarga {

  opciones = input.required<readonly OpcionDescarga[]>();
  etiqueta = input('Descargar');
  etiquetaAccesible = input<string | null>(null);
  variante = input<'primario' | 'secundario'>('secundario');
  deshabilitado = input(false);
  cargando = input(false);

  abierto = signal(false);
  // Posición del menú (fixed, para que no lo recorte una tabla con scroll). Se ancla por arriba, o por abajo (se abre
  // hacia arriba) si debajo del botón no cabe.
  posicion = signal<{ top: number | null; bottom: number | null; left: number; minAncho: number }>({ top: 0, bottom: null, left: 0, minAncho: 0 });

  inactivo = computed(() => this.deshabilitado() || this.cargando());

  private boton = viewChild.required<ElementRef<HTMLButtonElement>>('boton');
  private items = viewChildren<ElementRef<HTMLButtonElement>>('item');
  private host = viewChild.required<ElementRef<HTMLElement>>('raiz');

  // Al abrirse, un scroll (de la página o de cualquier contenedor) o un cambio de tamaño cierran el menú, que es fixed y
  // no sigue a su botón.
  private quitarCierreAutomatico: (() => void) | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.quitarCierreAutomatico?.());
  }

  alternar(): void {
    if (this.abierto()) {
      this.cerrar(false);
    } else {
      this.abrir();
    }
  }

  private abrir(): void {
    if (this.inactivo()) {
      return;
    }
    const caja = this.boton().nativeElement.getBoundingClientRect();
    const alto = window.innerHeight;
    const cabeAbajo = alto - caja.bottom >= ESPACIO_MINIMO_ABAJO_PX;
    this.posicion.set({
      top: cabeAbajo ? caja.bottom + 4 : null,
      bottom: cabeAbajo ? null : alto - caja.top + 4,
      left: caja.left,
      minAncho: caja.width
    });
    this.abierto.set(true);
    this.activarCierreAutomatico();
    // El menú se pinta en el siguiente ciclo: el foco pasa a la primera opción.
    queueMicrotask(() => this.items()[0]?.nativeElement.focus());
  }

  private activarCierreAutomatico(): void {
    this.quitarCierreAutomatico?.();
    const alDesplazar = (evento: Event) => {
      // El scroll interno del propio menú (si es alto) no lo cierra.
      if (!(evento.target instanceof Node && this.host().nativeElement.contains(evento.target))) {
        this.cerrar(false);
      }
    };
    const alRedimensionar = () => this.cerrar(false);
    window.addEventListener('scroll', alDesplazar, true);
    window.addEventListener('resize', alRedimensionar);
    this.quitarCierreAutomatico = () => {
      window.removeEventListener('scroll', alDesplazar, true);
      window.removeEventListener('resize', alRedimensionar);
      this.quitarCierreAutomatico = null;
    };
  }

  cerrar(devolverFoco: boolean): void {
    this.quitarCierreAutomatico?.();
    this.abierto.set(false);
    if (devolverFoco) {
      this.boton().nativeElement.focus();
    }
  }

  elegir(opcion: OpcionDescarga): void {
    this.cerrar(true);
    opcion.accion();
  }

  alHacerClickEnDocumento(evento: Event): void {
    if (this.abierto() && !this.host().nativeElement.contains(evento.target as Node)) {
      this.cerrar(false);
    }
  }

  alTeclearEnBoton(evento: KeyboardEvent): void {
    if (evento.key === 'ArrowDown' && !this.abierto()) {
      evento.preventDefault();
      this.abrir();
    } else if (evento.key === 'Escape' && this.abierto()) {
      this.cerrar(true);
    }
  }

  alTeclearEnMenu(evento: KeyboardEvent): void {
    const lista = this.items().map(item => item.nativeElement);
    const actual = lista.indexOf(document.activeElement as HTMLButtonElement);
    let destino: number | null = null;

    switch (evento.key) {
      case 'ArrowDown': destino = (actual + 1) % lista.length; break;
      case 'ArrowUp': destino = (actual - 1 + lista.length) % lista.length; break;
      case 'Home': destino = 0; break;
      case 'End': destino = lista.length - 1; break;
      case 'Escape':
        evento.preventDefault();
        this.cerrar(true);
        return;
      case 'Tab':
        this.cerrar(false);
        return;
    }
    if (destino !== null) {
      evento.preventDefault();
      lista[destino]?.focus();
    }
  }

}
