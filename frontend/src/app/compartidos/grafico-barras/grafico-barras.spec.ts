import { TestBed } from '@angular/core/testing';
import { GraficoInforme } from '../../modelos/reportes';
import { COLORES_SERIES, GraficoBarras } from './grafico-barras';

describe('GraficoBarras', () => {
  it('los colores de las series salen de tokens de tema, no de valores fijos', () => {
    expect(COLORES_SERIES.every(color => /^var\(--app-grafico-[1-4]\)$/.test(color))).toBe(true);

    const fixture = TestBed.createComponent(GraficoBarras);
    const grafico = {
      titulo: 'Prueba', etiquetas: ['A', 'B'],
      series: [{ nombre: 'S1', valores: [1, 2] }, { nombre: 'S2', valores: [3, 4] }]
    } as unknown as GraficoInforme;
    fixture.componentRef.setInput('grafico', grafico);
    fixture.detectChanges();
    const instancia = fixture.componentInstance;
    expect(instancia.series().map(serie => serie.color)).toEqual(COLORES_SERIES.slice(0, 2));
    expect(instancia.filas()[0].barras.map(barra => barra.color)).toEqual(COLORES_SERIES.slice(0, 2));
  });
});
