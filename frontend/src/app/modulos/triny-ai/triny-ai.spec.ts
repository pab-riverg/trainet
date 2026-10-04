import { TestBed } from '@angular/core/testing';
import { TrinyAi } from './triny-ai';

describe('TrinyAi: alto visible del chat', () => {
  type Oyente = () => void;
  let oyentes: Oyente[];

  beforeEach(() => {
    oyentes = [];
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 640,
        addEventListener: (_tipo: string, oyente: Oyente) => oyentes.push(oyente),
        removeEventListener: (_tipo: string, oyente: Oyente) => { oyentes = oyentes.filter(item => item !== oyente); }
      }
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'visualViewport');
    document.documentElement.style.removeProperty('--alto-visible');
  });

  function crear() {
    TestBed.overrideComponent(TrinyAi, { set: { imports: [], template: '', templateUrl: undefined, styleUrl: undefined } });
    const fixture = TestBed.createComponent(TrinyAi);
    fixture.detectChanges();
    return fixture;
  }

  const variable = () => document.documentElement.style.getPropertyValue('--alto-visible');

  it('fija --alto-visible mientras se ve el chat y la quita al cambiar de pestaña', () => {
    const fixture = crear();
    expect(variable()).toBe('640px');
    expect(oyentes.length).toBe(1);

    fixture.componentInstance.cambiarPestana('historial');
    fixture.detectChanges();
    expect(variable()).toBe('');
    expect(oyentes.length).toBe(0);

    fixture.componentInstance.cambiarPestana('asistente');
    fixture.detectChanges();
    expect(variable()).toBe('640px');
  });

  it('al destruirse la página quita la variable y el listener', () => {
    const fixture = crear();
    fixture.destroy();
    expect(variable()).toBe('');
    expect(oyentes.length).toBe(0);
  });
});
