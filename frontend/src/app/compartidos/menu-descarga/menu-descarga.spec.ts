import { TestBed } from '@angular/core/testing';
import { MenuDescarga, OpcionDescarga } from './menu-descarga';

describe('MenuDescarga', () => {
  function crear(entradas: Record<string, unknown> = {}) {
    const pdf = vi.fn();
    const excel = vi.fn();
    const opciones: OpcionDescarga[] = [{ etiqueta: 'PDF', accion: pdf }, { etiqueta: 'Excel', accion: excel }];
    const fixture = TestBed.createComponent(MenuDescarga);
    fixture.componentRef.setInput('opciones', opciones);
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    const boton = html.querySelector('button.menu-boton') as HTMLButtonElement;
    const items = () => Array.from(html.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    const abrir = async () => {
      boton.click();
      fixture.detectChanges();
      await fixture.whenStable();
    };
    const teclear = (destino: Element, key: string) => {
      destino.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
      fixture.detectChanges();
    };
    return { fixture, html, boton, items, abrir, teclear, pdf, excel };
  }

  afterEach(() => document.body.replaceChildren());

  it('es un único botón con aria-haspopup y aria-expanded que abre y cierra con clic', async () => {
    const { fixture, html, boton, items, abrir } = crear();
    expect(boton.getAttribute('aria-haspopup')).toBe('menu');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(html.querySelector('[role="menu"]')).toBeNull();

    await abrir();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(html.querySelector('[role="menu"]')).not.toBeNull();
    expect(items().map(i => i.textContent?.trim())).toEqual(['PDF', 'Excel']);
    expect(document.activeElement).toBe(items()[0]);

    boton.click();
    fixture.detectChanges();
    expect(html.querySelector('[role="menu"]')).toBeNull();
  });

  it('las flechas mueven entre opciones con vuelta', async () => {
    const { items, abrir, teclear, html } = crear();
    await abrir();
    const menu = html.querySelector('[role="menu"]') as HTMLElement;
    teclear(menu, 'ArrowDown');
    expect(document.activeElement).toBe(items()[1]);
    teclear(menu, 'ArrowDown');
    expect(document.activeElement).toBe(items()[0]);
    teclear(menu, 'ArrowUp');
    expect(document.activeElement).toBe(items()[1]);
  });

  it('ArrowDown en el botón abre el menú', async () => {
    const { fixture, html, boton, teclear } = crear();
    teclear(boton, 'ArrowDown');
    await fixture.whenStable();
    expect(html.querySelector('[role="menu"]')).not.toBeNull();
  });

  it('Escape cierra y devuelve el foco al botón', async () => {
    const { fixture, html, boton, abrir, teclear } = crear();
    await abrir();
    teclear(html.querySelector('[role="menu"]') as HTMLElement, 'Escape');
    fixture.detectChanges();
    expect(html.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(boton);
  });

  it('el clic fuera cierra', async () => {
    const { fixture, html, abrir } = crear();
    await abrir();
    document.body.click();
    fixture.detectChanges();
    expect(html.querySelector('[role="menu"]')).toBeNull();
  });

  it('elegir una opción la ejecuta una sola vez, cierra y devuelve el foco', async () => {
    const { fixture, html, boton, items, abrir, pdf, excel } = crear();
    await abrir();
    items()[1].click();
    fixture.detectChanges();
    expect(excel).toHaveBeenCalledTimes(1);
    expect(pdf).not.toHaveBeenCalled();
    expect(html.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(boton);
  });

  it('mientras descarga muestra "Descargando…" y no se puede abrir ni lanzar otra vez', () => {
    const { fixture, html, boton } = crear({ cargando: true });
    expect(boton.disabled).toBe(true);
    expect(boton.textContent).toContain('Descargando…');
    boton.click();
    fixture.detectChanges();
    expect(html.querySelector('[role="menu"]')).toBeNull();
  });

  it('deshabilitado no abre', () => {
    const { fixture, html, boton } = crear({ deshabilitado: true });
    boton.click();
    fixture.detectChanges();
    expect(boton.disabled).toBe(true);
    expect(html.querySelector('[role="menu"]')).toBeNull();
  });
});

describe('MenuDescarga: posición y cierre automático', () => {
  async function abierto() {
    const fixture = TestBed.createComponent(MenuDescarga);
    fixture.componentRef.setInput('opciones', [{ etiqueta: 'PDF', accion: () => undefined }]);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    (html.querySelector('button.menu-boton') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, html, menu: () => html.querySelector('[role="menu"]') as HTMLElement | null };
  }

  afterEach(() => document.body.replaceChildren());

  it('un scroll de la página o de un contenedor cierra el menú, pero no el scroll del propio menú', async () => {
    const { fixture, menu } = await abierto();
    menu()!.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(menu()).not.toBeNull();

    document.body.dispatchEvent(new Event('scroll'));
    fixture.detectChanges();
    expect(menu()).toBeNull();
  });

  it('un cambio de tamaño cierra el menú', async () => {
    const { fixture, menu } = await abierto();
    window.dispatchEvent(new Event('resize'));
    fixture.detectChanges();
    expect(menu()).toBeNull();
  });

  it('al cerrarse quita los listeners (un scroll posterior no hace nada)', async () => {
    const quitar = vi.spyOn(window, 'removeEventListener');
    const { fixture } = await abierto();
    fixture.destroy();
    expect(quitar).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    expect(quitar).toHaveBeenCalledWith('resize', expect.any(Function));
    quitar.mockRestore();
  });

  it('se abre hacia arriba cuando debajo del botón no cabe', async () => {
    const original = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 100 });
    const { menu } = await abierto();
    expect(menu()!.style.bottom).not.toBe('');
    expect(menu()!.style.top).toBe('');
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: original });
  });
});
