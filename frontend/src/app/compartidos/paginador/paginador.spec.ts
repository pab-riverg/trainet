import { TestBed } from '@angular/core/testing';
import { Paginador } from './paginador';

describe('Paginador', () => {
  function crear(total: number, pagina: number) {
    const fixture = TestBed.createComponent(Paginador);
    fixture.componentRef.setInput('total', total);
    fixture.componentRef.setInput('pagina', pagina);
    const emitidas: number[] = [];
    fixture.componentInstance.cambioPagina.subscribe(n => emitidas.push(n));
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    const boton = (texto: string) => Array.from(html.querySelectorAll('button')).find(b => b.textContent?.trim() === texto);
    return { fixture, html, emitidas, boton };
  }

  it('no se muestra con una sola página (ni con lista vacía)', () => {
    expect(crear(10, 1).html.querySelector('nav')).toBeNull();
    expect(crear(0, 1).html.querySelector('nav')).toBeNull();
    expect((crear(5, 1).html.textContent ?? '').trim()).toBe('');
  });

  it('con más de una página muestra el rango y la navegación accesible', () => {
    const { html } = crear(47, 2);
    expect(html.textContent).toContain('Mostrando 11–20 de 47');
    expect(html.querySelector('nav')?.getAttribute('aria-label')).toBe('Paginación');
  });

  it('resalta la página actual con aria-current y etiqueta cada número', () => {
    const { html } = crear(47, 2);
    const actual = html.querySelector('[aria-current="page"]');
    expect(actual?.textContent?.trim()).toBe('2');
    expect(actual?.classList).toContain('activa');
    expect(html.querySelectorAll('[aria-current]').length).toBe(1);
    expect(html.querySelector('button[aria-label="Ir a la página 3"]')).not.toBeNull();
  });

  it('Anterior está deshabilitado en la primera página y Siguiente en la última', () => {
    expect(crear(47, 1).boton('Anterior')?.disabled).toBe(true);
    expect(crear(47, 1).boton('Siguiente')?.disabled).toBe(false);
    expect(crear(47, 5).boton('Siguiente')?.disabled).toBe(true);
    expect(crear(47, 5).boton('Anterior')?.disabled).toBe(false);
  });

  it('emite la página al pulsar un número, Anterior o Siguiente, pero no la actual', () => {
    const { html, emitidas, boton } = crear(47, 2);
    (html.querySelector('button[aria-label="Ir a la página 4"]') as HTMLButtonElement).click();
    boton('Anterior')?.click();
    boton('Siguiente')?.click();
    (html.querySelector('button[aria-label="Ir a la página 2"]') as HTMLButtonElement).click();
    expect(emitidas).toEqual([4, 1, 3]);
  });

  it('la elipsis no es un botón', () => {
    const { html } = crear(200, 10);
    expect(html.querySelector('.paginador-elipsis')).not.toBeNull();
    expect(html.querySelector('.paginador-elipsis')?.tagName).toBe('SPAN');
  });
});
