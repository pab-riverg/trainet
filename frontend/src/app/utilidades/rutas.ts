import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { distinctUntilChanged, filter, map } from 'rxjs';

// Ruta interna: una sola '/' inicial, solo letras, números, '-', '_' y '/' en el camino, y a lo sumo una
// query simple (clave=valor&…). Sin '//', esquemas (http:, javascript:), '\', espacios ni fragmentos.
const RUTA_INTERNA = /^\/[A-Za-z0-9_\-/]*(\?[A-Za-z0-9_\-]+=[A-Za-z0-9_\-]*(&[A-Za-z0-9_\-]+=[A-Za-z0-9_\-]*)*)?$/;
const MAX_RUTA = 120;

// Ruta de un resultado de búsqueda: un solo módulo, `vista` opcional y `q` opcional codificado con
// encodeURIComponent (letras, números y -_.~ tal cual; el resto como %XX). Nunca un detalle ni ids en el camino.
const TEXTO_CODIFICADO = '(?:[A-Za-z0-9_.~-]|%[0-9A-Fa-f]{2})+';
const RUTA_DE_BUSQUEDA = new RegExp(
  `^/[a-z0-9_-]+(?:\\?(?:vista=[a-z0-9_-]+(?:&q=${TEXTO_CODIFICADO})?|q=${TEXTO_CODIFICADO}))?$`
);
// 60 caracteres con tres bytes UTF-8 cada uno ocupan 9 caracteres codificados; margen para módulo y vista.
const MAX_RUTA_BUSQUEDA = 700;

/** True si `ruta` es una ruta interna segura para navegar con el Router (nunca abre sitios externos). */
export function rutaInternaSegura(ruta: string | null | undefined): boolean {
  return !!ruta && ruta.length <= MAX_RUTA && !ruta.startsWith('//') && !ruta.includes('//') && RUTA_INTERNA.test(ruta);
}

/** True si `ruta` es un resultado de búsqueda válido: módulo + `vista` + `q` con caracteres seguros, sin detalle. */
export function rutaDeBusquedaSegura(ruta: string | null | undefined): boolean {
  return !!ruta && ruta.length <= MAX_RUTA_BUSQUEDA && RUTA_DE_BUSQUEDA.test(ruta);
}

/** Primer segmento de una ruta interna ('/compras?vista=x' -> '/compras'). */
export function rutaDeModulo(ruta: string): string {
  return '/' + ruta.slice(1).split(/[/?]/)[0];
}

/**
 * Mantiene la pestaña activa y `?vista=` de la URL sincronizados en los dos sentidos:
 * - URL -> pestaña: al cargar y cada vez que cambie el query param (también si ya estás en el módulo) se llama
 *   a `activar`. Una vista desconocida o ausente se ignora y se conserva la pestaña actual.
 * - pestaña -> URL: la función devuelta actualiza `vista` (conservando el resto de parámetros salvo `q`, que era
 *   de la búsqueda anterior) con replaceUrl, sin llenar el historial. Debe llamarse al CAMBIAR de pestaña a mano.
 * No hay bucle: `activar` solo cambia el estado, nunca navega.
 * Debe llamarse en un contexto de inyección (constructor o inicializador de campo).
 */
export function sincronizarPestanaConVista(
  idsValidos: () => readonly string[],
  activar: (id: string) => void
): (id: string) => void {
  const router = inject(Router);
  const ruta = inject(ActivatedRoute);

  ruta.queryParamMap
    .pipe(map(params => params.get('vista')), takeUntilDestroyed(inject(DestroyRef)))
    .subscribe(vista => {
      if (vista && idsValidos().includes(vista)) {
        activar(vista);
      }
    });

  return id => {
    void router.navigate([], {
      relativeTo: ruta,
      queryParams: { vista: id, q: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  };
}

/**
 * Precarga y mantiene al día la caja de búsqueda de una pantalla con `?q=`: al crearse y cada vez que cambie el
 * parámetro (aunque ya estés en el módulo). Sin `q` no toca el campo. Llamar como primera línea del constructor,
 * antes de que la pantalla cargue su lista, para que la primera consulta ya lleve el texto.
 */
export function sincronizarBusquedaConQ(control: FormControl<string>): void {
  inject(ActivatedRoute).queryParamMap
    .pipe(
      map(params => params.get('q')),
      filter((texto): texto is string => texto !== null),
      distinctUntilChanged(),
      takeUntilDestroyed(inject(DestroyRef))
    )
    .subscribe(texto => control.setValue(texto));
}
