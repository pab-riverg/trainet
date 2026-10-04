import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Acciones por fila de las tablas y listas. */
export type AccionFila =
  | 'ver' | 'descargar' | 'editar' | 'eliminar' | 'archivar' | 'restaurar'
  | 'abrir' | 'agregar' | 'aprobar' | 'rechazar' | 'quitar' | 'cancelar'
  | 'acuerdo' | 'cotizacion';

interface DefinicionAccion {
  // Clase de Bootstrap Icons.
  icono: string;
  // Hover en rojo para las acciones destructivas.
  peligro: boolean;
}

/** Único mapa acción -> icono. Cambiar un icono aquí lo cambia en todas las pantallas. */
export const ACCIONES_FILA: Readonly<Record<AccionFila, DefinicionAccion>> = {
  ver: { icono: 'bi-eye', peligro: false },
  descargar: { icono: 'bi-download', peligro: false },
  editar: { icono: 'bi-pencil', peligro: false },
  eliminar: { icono: 'bi-trash', peligro: true },
  archivar: { icono: 'bi-archive', peligro: false },
  restaurar: { icono: 'bi-arrow-counterclockwise', peligro: false },
  abrir: { icono: 'bi-box-arrow-up-right', peligro: false },
  agregar: { icono: 'bi-plus-lg', peligro: false },
  aprobar: { icono: 'bi-check-circle', peligro: false },
  rechazar: { icono: 'bi-x-circle', peligro: true },
  quitar: { icono: 'bi-trash', peligro: true },
  cancelar: { icono: 'bi-x-circle', peligro: true },
  // Los dos archivos de un acuerdo (el acuerdo y su cotización) se distinguen por icono.
  acuerdo: { icono: 'bi-file-earmark-arrow-down', peligro: false },
  cotizacion: { icono: 'bi-receipt', peligro: false }
};

/**
 * Icono de acción por fila (único estilo para todos los módulos). El clic se escucha en el propio elemento
 * (`<app-boton-accion (click)="...">`); con `enlace` se comporta como enlace que abre en una pestaña nueva.
 * La etiqueta es obligatoria: es el nombre accesible y el texto de ayuda (`titulo` solo si debe ser distinto).
 */
@Component({
  selector: 'app-boton-accion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './boton-accion.html',
  styleUrl: './boton-accion.css',
})
export class BotonAccion {

  accion = input.required<AccionFila>();
  etiqueta = input.required<string>();
  titulo = input<string | null>(null);
  deshabilitado = input(false);
  enlace = input<string | null>(null);

  icono = computed(() => ACCIONES_FILA[this.accion()].icono);
  peligro = computed(() => ACCIONES_FILA[this.accion()].peligro);
  ayuda = computed(() => this.titulo() ?? this.etiqueta());

}
