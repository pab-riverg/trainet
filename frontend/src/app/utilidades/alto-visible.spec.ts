import { seguirAltoVisible } from './alto-visible';

describe('seguirAltoVisible', () => {
  type Oyente = () => void;
  let oyentes: Oyente[];
  let alto: number;

  beforeEach(() => {
    oyentes = [];
    alto = 700;
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        get height() { return alto; },
        addEventListener: (_tipo: string, oyente: Oyente) => oyentes.push(oyente),
        removeEventListener: (_tipo: string, oyente: Oyente) => { oyentes = oyentes.filter(item => item !== oyente); }
      }
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(window, 'visualViewport');
    document.documentElement.style.removeProperty('--alto-visible');
  });

  const variable = () => document.documentElement.style.getPropertyValue('--alto-visible');

  it('fija la variable al montarse y la actualiza cuando cambia el viewport visual (teclado)', () => {
    const detener = seguirAltoVisible(document);
    expect(variable()).toBe('700px');
    expect(oyentes.length).toBe(1);

    alto = 380;
    oyentes.forEach(oyente => oyente());
    expect(variable()).toBe('380px');
    detener();
  });

  it('al desmontarse quita el listener y la variable', () => {
    const detener = seguirAltoVisible(document);
    detener();
    expect(oyentes.length).toBe(0);
    expect(variable()).toBe('');
  });

  it('sin visualViewport no hace nada y no falla', () => {
    Reflect.deleteProperty(window, 'visualViewport');
    const detener = seguirAltoVisible(document);
    expect(variable()).toBe('');
    expect(() => detener()).not.toThrow();
  });
});
