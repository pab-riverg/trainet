import { DestroyRef, afterNextRender, inject } from '@angular/core';

interface InstanciaModal {
  show(): void;
  hide(): void;
}

// Bootstrap se carga como script global (angular.json); solo se declara lo que se usa de él.
declare const bootstrap: {
  Modal: {
    getInstance(elemento: Element): InstanciaModal | null;
    getOrCreateInstance(elemento: Element): InstanciaModal;
  };
};

export function cerrarModal(id: string): void {
  const elemento = document.getElementById(id);
  if (!elemento) {
    return;
  }

  const limpiarResiduoDeModal = () => {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
  };

  elemento.addEventListener('hidden.bs.modal', limpiarResiduoDeModal, { once: true });
  setTimeout(limpiarResiduoDeModal, 400);

  bootstrap.Modal.getInstance(elemento)?.hide();
}

export function abrirModal(id: string): void {
  const elemento = document.getElementById(id);
  if (elemento) {
    bootstrap.Modal.getOrCreateInstance(elemento).show();
  }
}

/**
 * Vigila un modal de Bootstrap desde un componente (llamar en el constructor):
 * - `impedirCierre`: mientras devuelva true el modal no se puede cerrar (Escape, clic fuera, X ni Cancelar).
 * - `alCerrar`: se ejecuta cuando el modal terminó de cerrarse, sea cual sea la forma (para reiniciar el formulario).
 * Los listeners se quitan solos al destruirse el componente.
 */
export function vigilarModal(id: string, opciones: { alCerrar?: () => void; impedirCierre?: () => boolean }): void {
  const destruccion = inject(DestroyRef);
  afterNextRender(() => {
    const elemento = document.getElementById(id);
    if (!elemento) {
      return;
    }
    const alOcultar = (evento: Event) => {
      if (opciones.impedirCierre?.()) {
        evento.preventDefault();
      }
    };
    const alOcultado = () => opciones.alCerrar?.();
    elemento.addEventListener('hide.bs.modal', alOcultar);
    elemento.addEventListener('hidden.bs.modal', alOcultado);
    destruccion.onDestroy(() => {
      elemento.removeEventListener('hide.bs.modal', alOcultar);
      elemento.removeEventListener('hidden.bs.modal', alOcultado);
    });
  });
}
