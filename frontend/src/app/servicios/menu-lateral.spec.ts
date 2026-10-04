import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MenuLateral } from './menu-lateral';

@Component({ template: '' })
class Vacio {}

type OyenteMedia = (evento: { matches: boolean }) => void;

describe('MenuLateral', () => {
  const cuerpo = document.body;
  let oyentesMedia: OyenteMedia[];

  beforeEach(() => {
    oyentesMedia = [];
    // jsdom no implementa matchMedia: se simula para poder disparar el cambio a escritorio.
    window.matchMedia = ((consulta: string) => ({
      matches: false,
      media: consulta,
      addEventListener: (_tipo: string, oyente: OyenteMedia) => oyentesMedia.push(oyente),
      removeEventListener: (_tipo: string, oyente: OyenteMedia) => {
        oyentesMedia = oyentesMedia.filter(item => item !== oyente);
      }
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
    cuerpo.classList.remove('sidebar-open', 'modal-open');
    cuerpo.style.removeProperty('overflow');
  });

  function crear() {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', component: Vacio }])] });
    return { menu: TestBed.inject(MenuLateral), router: TestBed.inject(Router) };
  }

  it('arranca cerrado y no toca el body', () => {
    const { menu } = crear();
    expect(menu.abierto()).toBe(false);
    expect(cuerpo.classList.contains('sidebar-open')).toBe(false);
    expect(cuerpo.style.overflow).toBe('');
  });

  it('abrir marca la clase sidebar-open y bloquea el scroll del body', () => {
    const { menu } = crear();
    menu.abrir();
    expect(menu.abierto()).toBe(true);
    expect(cuerpo.classList.contains('sidebar-open')).toBe(true);
    expect(cuerpo.style.overflow).toBe('hidden');
  });

  it('cerrar quita la clase y libera el scroll', () => {
    const { menu } = crear();
    menu.abrir();
    menu.cerrar();
    expect(menu.abierto()).toBe(false);
    expect(cuerpo.classList.contains('sidebar-open')).toBe(false);
    expect(cuerpo.style.overflow).toBe('');
  });

  it('alternar abre y cierra', () => {
    const { menu } = crear();
    menu.alternar();
    expect(menu.abierto()).toBe(true);
    menu.alternar();
    expect(menu.abierto()).toBe(false);
    expect(cuerpo.style.overflow).toBe('');
  });

  it('abrir dos veces seguidas no deja nada bloqueado al cerrar una sola vez', () => {
    const { menu } = crear();
    menu.abrir();
    menu.abrir();
    menu.cerrar();
    expect(cuerpo.classList.contains('sidebar-open')).toBe(false);
    expect(cuerpo.style.overflow).toBe('');
  });

  it('se cierra al terminar una navegación y libera el body', async () => {
    const { menu, router } = crear();
    menu.abrir();
    await router.navigateByUrl('/capacitacion');
    expect(menu.abierto()).toBe(false);
    expect(cuerpo.classList.contains('sidebar-open')).toBe(false);
    expect(cuerpo.style.overflow).toBe('');
  });

  it('se cierra con Escape y no con otras teclas', () => {
    const { menu } = crear();
    menu.abrir();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(menu.abierto()).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menu.abierto()).toBe(false);
    expect(cuerpo.style.overflow).toBe('');
  });

  it('se cierra al pasar a 992px o más y no al pasar a pantalla estrecha', () => {
    const { menu } = crear();
    menu.abrir();
    oyentesMedia.forEach(oyente => oyente({ matches: false }));
    expect(menu.abierto()).toBe(true);
    oyentesMedia.forEach(oyente => oyente({ matches: true }));
    expect(menu.abierto()).toBe(false);
    expect(cuerpo.classList.contains('sidebar-open')).toBe(false);
    expect(cuerpo.style.overflow).toBe('');
  });

  it('no libera el bloqueo de scroll de un modal de Bootstrap abierto', () => {
    const { menu } = crear();
    menu.abrir();
    cuerpo.classList.add('modal-open');
    menu.cerrar();
    expect(cuerpo.style.overflow).toBe('hidden');
  });

  it('quita sus oyentes al destruirse', () => {
    const quitar = vi.spyOn(document, 'removeEventListener');
    const { menu } = crear();
    expect(menu.abierto()).toBe(false);
    expect(oyentesMedia.length).toBe(1);
    TestBed.resetTestingModule();
    expect(quitar).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(oyentesMedia.length).toBe(0);
    quitar.mockRestore();
  });

  it('funciona sin matchMedia (solo se pierde el cierre al agrandar la ventana)', () => {
    Reflect.deleteProperty(window, 'matchMedia');
    const { menu } = crear();
    menu.abrir();
    expect(menu.abierto()).toBe(true);
  });
});
