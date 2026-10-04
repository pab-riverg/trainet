import { Signal, computed, signal } from '@angular/core';

/** Filas por página en todo el sistema (fijas, sin selector de tamaño). */
export const TAMANO_PAGINA_DEFECTO = 10;

/** Elemento de la barra de páginas: un número de página o una elipsis no clicable. */
export type ElementoPaginacion = number | '…';

/** Cantidad de páginas; siempre al menos 1 (una lista vacía tiene una página vacía). */
export function totalPaginas(total: number, tamano = TAMANO_PAGINA_DEFECTO): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / tamano));
}

/** Limita la página al rango válido [1, totalPaginas]. */
export function ajustarPagina(pagina: number, total: number, tamano = TAMANO_PAGINA_DEFECTO): number {
  const entera = Number.isFinite(pagina) ? Math.trunc(pagina) : 1;
  return Math.min(Math.max(1, entera), totalPaginas(total, tamano));
}

/** El trozo de `items` que corresponde a la página (1-based). */
export function paginar<T>(items: readonly T[], pagina: number, tamano = TAMANO_PAGINA_DEFECTO): T[] {
  const valida = ajustarPagina(pagina, items.length, tamano);
  return items.slice((valida - 1) * tamano, valida * tamano);
}

/**
 * Páginas a mostrar con elipsis: siempre la primera y la última, la actual y una ventana de ±1.
 * Con 7 páginas o menos se muestran todas. Un hueco de una sola página se rellena con ese número en vez de '…'.
 * Ejemplo: actual 5 de 20 -> [1, '…', 4, 5, 6, '…', 20].
 */
export function ventanaPaginas(actual: number, total: number): ElementoPaginacion[] {
  if (total <= 7) {
    return Array.from({ length: Math.max(0, total) }, (_, i) => i + 1);
  }
  const fijas = new Set([1, total, actual - 1, actual, actual + 1].filter(n => n >= 1 && n <= total));
  const ordenadas = [...fijas].sort((a, b) => a - b);
  const resultado: ElementoPaginacion[] = [];
  ordenadas.forEach((pagina, i) => {
    const previa = ordenadas[i - 1];
    if (previa !== undefined && pagina - previa === 2) {
      resultado.push(previa + 1);
    } else if (previa !== undefined && pagina - previa > 2) {
      resultado.push('…');
    }
    resultado.push(pagina);
  });
  return resultado;
}

/** Rango "desde–hasta" (1-based) de los elementos de la página, para el texto "Mostrando 11–20 de 47". */
export function rangoMostrado(pagina: number, total: number, tamano = TAMANO_PAGINA_DEFECTO): { desde: number; hasta: number } {
  if (total <= 0) {
    return { desde: 0, hasta: 0 };
  }
  const valida = ajustarPagina(pagina, total, tamano);
  return { desde: (valida - 1) * tamano + 1, hasta: Math.min(valida * tamano, total) };
}

/**
 * Mecánica de paginación en cliente para un componente. Uso:
 *   paginacion = crearPaginacion(() => this.items());           // después de declarar `items`
 *   @for (fila of paginacion.visibles(); ...)  y  <app-paginador [total]="paginacion.total()"
 *       [pagina]="paginacion.pagina()" (cambioPagina)="paginacion.irA($event)" />
 * - Al cambiar la búsqueda, un filtro o la pestaña: llamar a `reiniciar()` (vuelve a la página 1).
 * - Al borrar o filtrar, la página se ajusta sola a la última válida; al crear o editar se conserva.
 */
export function crearPaginacion<T>(items: () => readonly T[], tamano = TAMANO_PAGINA_DEFECTO): {
  pagina: Signal<number>;
  total: Signal<number>;
  tamano: number;
  visibles: Signal<T[]>;
  irA: (pagina: number) => void;
  reiniciar: () => void;
} {
  const solicitada = signal(1);
  const total = computed(() => items().length);
  const pagina = computed(() => ajustarPagina(solicitada(), total(), tamano));
  const visibles = computed(() => paginar(items(), pagina(), tamano));
  return {
    pagina,
    total,
    tamano,
    visibles,
    irA: (nueva: number) => solicitada.set(ajustarPagina(nueva, total(), tamano)),
    reiniciar: () => solicitada.set(1)
  };
}
