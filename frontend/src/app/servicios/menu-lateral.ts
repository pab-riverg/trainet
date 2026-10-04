import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/** Desde este ancho (breakpoint lg de Bootstrap) el menú lateral es fijo y ya no es un panel. Ver styles.css. */
const CONSULTA_ESCRITORIO = '(min-width: 992px)';

/**
 * Única fuente de verdad del panel lateral en pantallas < 992px. Mantiene el estado en un signal y es el único
 * que toca el <body>: la clase `sidebar-open` (que muestra el panel y el velo) y el bloqueo de scroll.
 * Se cierra solo al terminar una navegación, con Escape y al pasar a ≥ 992px, así que el body nunca queda bloqueado.
 */
@Injectable({ providedIn: 'root' })
export class MenuLateral {

  private documento = inject(DOCUMENT);
  private estado = signal(false);

  readonly abierto = this.estado.asReadonly();

  constructor() {
    const destruccion = inject(DestroyRef);

    inject(Router).events
      .pipe(filter(evento => evento instanceof NavigationEnd), takeUntilDestroyed(destruccion))
      .subscribe(() => this.cerrar());

    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        this.cerrar();
      }
    };
    this.documento.addEventListener('keydown', alPulsarTecla);
    destruccion.onDestroy(() => this.documento.removeEventListener('keydown', alPulsarTecla));

    // jsdom y navegadores muy antiguos no tienen matchMedia: sin él solo se pierde el cierre al agrandar la ventana.
    const escritorio = this.documento.defaultView?.matchMedia?.(CONSULTA_ESCRITORIO);
    if (escritorio) {
      const alCambiar = (evento: MediaQueryListEvent) => {
        if (evento.matches) {
          this.cerrar();
        }
      };
      escritorio.addEventListener('change', alCambiar);
      destruccion.onDestroy(() => escritorio.removeEventListener('change', alCambiar));
    }
  }

  abrir(): void {
    this.fijar(true);
  }

  cerrar(): void {
    this.fijar(false);
  }

  alternar(): void {
    this.fijar(!this.estado());
  }

  private fijar(abierto: boolean): void {
    this.estado.set(abierto);

    const cuerpo = this.documento.body;
    cuerpo.classList.toggle('sidebar-open', abierto);
    if (abierto) {
      cuerpo.style.overflow = 'hidden';
    } else if (!cuerpo.classList.contains('modal-open')) {
      // Si un modal de Bootstrap está abierto, él es el dueño del bloqueo y lo libera al cerrarse.
      cuerpo.style.removeProperty('overflow');
    }
  }

}
