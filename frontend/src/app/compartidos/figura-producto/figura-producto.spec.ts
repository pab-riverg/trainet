import { TestBed } from '@angular/core/testing';
import { FiguraProducto } from './figura-producto';

describe('FiguraProducto', () => {
  function crear(ruta = '/img/home/dashboard.webp') {
    const fixture = TestBed.createComponent(FiguraProducto);
    fixture.componentRef.setInput('ruta', ruta);
    fixture.componentRef.setInput('alt', 'Captura del Dashboard');
    fixture.componentRef.setInput('nombre', 'Dashboard');
    fixture.componentRef.setInput('icono', 'bi-speedometer2');
    const cargas: boolean[] = [];
    fixture.componentInstance.cargaCambio.subscribe(valor => cargas.push(valor));
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    return { fixture, html, cargas };
  }

  it('muestra la imagen con su texto alternativo mientras no falle', () => {
    const { html } = crear();
    const imagen = html.querySelector('img') as HTMLImageElement;
    expect(imagen.getAttribute('src')).toContain('/img/home/dashboard.webp');
    expect(imagen.alt).toBe('Captura del Dashboard');
    expect(html.querySelector('.fp-marcador')).toBeNull();
  });

  it('emite true cuando la imagen carga', () => {
    const { html, cargas } = crear();
    html.querySelector('img')?.dispatchEvent(new Event('load'));
    expect(cargas).toEqual([true]);
  });

  it('si la imagen falla muestra el marcador (icono y nombre), quita la imagen y emite false', () => {
    const { fixture, html, cargas } = crear();
    html.querySelector('img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(html.querySelector('img')).toBeNull();
    const marcador = html.querySelector('.fp-marcador') as HTMLElement;
    expect(marcador.textContent).toContain('Dashboard');
    expect(marcador.querySelector('i.bi-speedometer2')).not.toBeNull();
    expect(marcador.getAttribute('aria-label')).toBe('Captura del Dashboard');
    expect(cargas).toEqual([false]);
  });

  it('al cambiar a otra ruta vuelve a intentar con la imagen', () => {
    const { fixture, html } = crear();
    html.querySelector('img')?.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    fixture.componentRef.setInput('ruta', '/img/home/triny.webp');
    fixture.detectChanges();
    expect(html.querySelector('.fp-marcador')).toBeNull();
    expect(html.querySelector('img')?.getAttribute('src')).toContain('/img/home/triny.webp');
  });
});
