import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import {
  TAMANO_PAGINA_DEFECTO, ajustarPagina, crearPaginacion, paginar, rangoMostrado, totalPaginas, ventanaPaginas
} from './paginacion';

const lista = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

describe('paginación: funciones puras', () => {
  it('el tamaño por defecto es 10', () => {
    expect(TAMANO_PAGINA_DEFECTO).toBe(10);
  });

  it('totalPaginas: 0 elementos, 1 página, exactamente 10, 11 y última incompleta', () => {
    expect(totalPaginas(0)).toBe(1);
    expect(totalPaginas(1)).toBe(1);
    expect(totalPaginas(10)).toBe(1);
    expect(totalPaginas(11)).toBe(2);
    expect(totalPaginas(47)).toBe(5);
    expect(totalPaginas(50)).toBe(5);
  });

  it('paginar devuelve el trozo de cada página, incluida la última incompleta', () => {
    expect(paginar([], 1)).toEqual([]);
    expect(paginar(lista(10), 1)).toEqual(lista(10));
    expect(paginar(lista(11), 1)).toEqual(lista(10));
    expect(paginar(lista(11), 2)).toEqual([11]);
    expect(paginar(lista(47), 5)).toEqual([41, 42, 43, 44, 45, 46, 47]);
    expect(paginar(lista(5), 3, 2)).toEqual([5]);
  });

  it('ajustarPagina limita al rango válido y nunca baja de 1', () => {
    expect(ajustarPagina(0, 47)).toBe(1);
    expect(ajustarPagina(-3, 47)).toBe(1);
    expect(ajustarPagina(3, 47)).toBe(3);
    expect(ajustarPagina(9, 47)).toBe(5);
    expect(ajustarPagina(2, 0)).toBe(1);
    expect(ajustarPagina(NaN, 47)).toBe(1);
  });

  it('tras borrar el último elemento de la última página, la página se ajusta a la anterior', () => {
    // 21 elementos -> página 3 con un solo elemento; se borra y quedan 20 (2 páginas).
    expect(ajustarPagina(3, 21)).toBe(3);
    expect(ajustarPagina(3, 20)).toBe(2);
  });

  it('ventanaPaginas: todas si son 7 o menos', () => {
    expect(ventanaPaginas(1, 1)).toEqual([1]);
    expect(ventanaPaginas(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('ventanaPaginas: elipsis a la derecha, a la izquierda y en ambos lados', () => {
    expect(ventanaPaginas(1, 20)).toEqual([1, 2, '…', 20]);
    expect(ventanaPaginas(2, 20)).toEqual([1, 2, 3, '…', 20]);
    expect(ventanaPaginas(5, 20)).toEqual([1, '…', 4, 5, 6, '…', 20]);
    expect(ventanaPaginas(19, 20)).toEqual([1, '…', 18, 19, 20]);
    expect(ventanaPaginas(20, 20)).toEqual([1, '…', 19, 20]);
  });

  it('ventanaPaginas: un hueco de una sola página muestra el número en vez de elipsis', () => {
    expect(ventanaPaginas(4, 20)).toEqual([1, 2, 3, 4, 5, '…', 20]);
    expect(ventanaPaginas(17, 20)).toEqual([1, '…', 16, 17, 18, 19, 20]);
  });

  it('rangoMostrado', () => {
    expect(rangoMostrado(1, 0)).toEqual({ desde: 0, hasta: 0 });
    expect(rangoMostrado(2, 47)).toEqual({ desde: 11, hasta: 20 });
    expect(rangoMostrado(5, 47)).toEqual({ desde: 41, hasta: 47 });
  });
});

describe('crearPaginacion', () => {
  function crear(n: number) {
    const items = signal(lista(n));
    const paginacion = TestBed.runInInjectionContext(() => crearPaginacion(() => items()));
    return { items, paginacion };
  }

  it('muestra 10 por página, cambia de página y vuelve a la 1 con reiniciar', () => {
    const { paginacion } = crear(25);
    expect(paginacion.visibles()).toEqual(lista(10));
    paginacion.irA(3);
    expect(paginacion.visibles()).toEqual([21, 22, 23, 24, 25]);
    paginacion.reiniciar();
    expect(paginacion.pagina()).toBe(1);
  });

  it('si la página actual deja de existir se ajusta a la última válida; al editar se conserva', () => {
    const { items, paginacion } = crear(21);
    paginacion.irA(3);
    items.set(lista(21).map(n => n * 2)); // editar: misma cantidad
    expect(paginacion.pagina()).toBe(3);
    items.set(lista(20)); // borrar el último
    expect(paginacion.pagina()).toBe(2);
    expect(paginacion.visibles()).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('irA limita al rango', () => {
    const { paginacion } = crear(25);
    paginacion.irA(99);
    expect(paginacion.pagina()).toBe(3);
    paginacion.irA(-1);
    expect(paginacion.pagina()).toBe(1);
  });
});
