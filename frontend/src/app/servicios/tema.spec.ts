import { TestBed } from '@angular/core/testing';
import { CLAVE_MODO_OSCURO, Tema } from './tema';

describe('Tema', () => {
  const raiz = document.documentElement;
  const atributos = () => [raiz.getAttribute('data-theme'), raiz.getAttribute('data-bs-theme')];

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.removeItem(CLAVE_MODO_OSCURO);
    raiz.removeAttribute('data-theme');
    raiz.removeAttribute('data-bs-theme');
  });

  function crear(guardado?: string) {
    if (guardado !== undefined) {
      localStorage.setItem(CLAVE_MODO_OSCURO, guardado);
    }
    return TestBed.inject(Tema);
  }

  it('por defecto es claro y no toca el documento', () => {
    const tema = crear();
    expect(tema.modoOscuro()).toBe(false);
    expect(atributos()).toEqual([null, null]);
  });

  it('lee la preferencia guardada, pero no aplica nada hasta que el shell se activa', () => {
    const tema = crear('true');
    expect(tema.modoOscuro()).toBe(true);
    expect(atributos()).toEqual([null, null]);
  });

  it('activar aplica data-theme y data-bs-theme; desactivar los quita sin borrar la preferencia', () => {
    const tema = crear('true');
    tema.activar();
    expect(atributos()).toEqual(['dark', 'dark']);
    tema.desactivar();
    expect(atributos()).toEqual([null, null]);
    expect(localStorage.getItem(CLAVE_MODO_OSCURO)).toBe('true');
    tema.activar();
    expect(atributos()).toEqual(['dark', 'dark']);
  });

  it('con preferencia clara, activar no pone atributos', () => {
    crear('false').activar();
    expect(atributos()).toEqual([null, null]);
  });

  it('alternar guarda en la clave y, con el shell activo, aplica o quita el tema', () => {
    const tema = crear();
    tema.activar();
    tema.alternar();
    TestBed.tick();
    expect(localStorage.getItem(CLAVE_MODO_OSCURO)).toBe('true');
    expect(atributos()).toEqual(['dark', 'dark']);
    tema.alternar();
    TestBed.tick();
    expect(localStorage.getItem(CLAVE_MODO_OSCURO)).toBe('false');
    expect(atributos()).toEqual([null, null]);
  });

  it('alternar con el shell desmontado no oscurece la pantalla pública', () => {
    const tema = crear();
    tema.alternar();
    TestBed.tick();
    expect(tema.modoOscuro()).toBe(true);
    expect(atributos()).toEqual([null, null]);
  });

  it('tolera que localStorage falle al leer y al escribir', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('bloqueado'); });
    const tema = TestBed.inject(Tema);
    expect(tema.modoOscuro()).toBe(false);
    expect(() => tema.alternar()).not.toThrow();
    expect(tema.modoOscuro()).toBe(true);
  });
});
