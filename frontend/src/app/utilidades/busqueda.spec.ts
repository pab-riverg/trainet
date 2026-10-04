import { segmentosResaltados } from './busqueda';

describe('segmentosResaltados', () => {
  it('marca las coincidencias sin distinguir mayúsculas ni tildes', () => {
    expect(segmentosResaltados('Capacitación de Seguridad', 'CAPACITACION')).toEqual([
      { texto: 'Capacitación', coincide: true },
      { texto: ' de Seguridad', coincide: false }
    ]);
  });

  it('marca todas las apariciones', () => {
    expect(segmentosResaltados('ab ab', 'ab').map(s => s.coincide)).toEqual([true, false, true]);
  });

  it('sin coincidencia o sin búsqueda devuelve el texto entero sin marcar', () => {
    expect(segmentosResaltados('Hola', 'xyz')).toEqual([{ texto: 'Hola', coincide: false }]);
    expect(segmentosResaltados('Hola', '  ')).toEqual([{ texto: 'Hola', coincide: false }]);
  });

  it('trata el HTML como texto plano', () => {
    const segmentos = segmentosResaltados('<b>x</b> zafiro', 'zafiro');
    expect(segmentos.map(s => s.texto).join('')).toBe('<b>x</b> zafiro');
    expect(segmentos.filter(s => s.coincide).map(s => s.texto)).toEqual(['zafiro']);
  });

  it('el resaltado a mitad de palabra no altera el texto', () => {
    const segmentos = segmentosResaltados('Impresora', 'press');
    expect(segmentos.map(s => s.texto).join('')).toBe('Impresora');
  });
});
