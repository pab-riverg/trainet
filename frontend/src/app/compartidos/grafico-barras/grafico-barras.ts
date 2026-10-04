import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { GraficoInforme } from '../../modelos/reportes';
import { formatearNumero } from '../../utilidades/reportes';

// Colores de las series: tokens --app-grafico-* de styles.css (cada tema define los suyos con contraste suficiente).
export const COLORES_SERIES = ['var(--app-grafico-1)', 'var(--app-grafico-2)', 'var(--app-grafico-3)', 'var(--app-grafico-4)'];

// Gráfico de barras horizontales propio (CSS), sin librerías. Muestra los valores como texto
// y ofrece una tabla de datos para lectores de pantalla.
@Component({
  selector: 'app-grafico-barras',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grafico-barras.html',
  styleUrl: './grafico-barras.css',
})
export class GraficoBarras {

  grafico = input.required<GraficoInforme>();

  formatear = formatearNumero;

  series = computed(() =>
    this.grafico().series.map((serie, i) => ({ nombre: serie.nombre, color: COLORES_SERIES[i % COLORES_SERIES.length] }))
  );

  // Una fila por categoría, con una barra por serie (el ancho es proporcional al mayor valor del gráfico).
  filas = computed(() => {
    const grafico = this.grafico();
    const maximo = Math.max(1, ...grafico.series.flatMap(serie => serie.valores));
    return grafico.etiquetas.map((etiqueta, i) => ({
      etiqueta,
      barras: grafico.series.map((serie, j) => {
        const valor = serie.valores[i] ?? 0;
        return {
          serie: serie.nombre,
          valor,
          porcentaje: Math.max(valor > 0 ? 2 : 0, (valor / maximo) * 100),
          color: COLORES_SERIES[j % COLORES_SERIES.length]
        };
      })
    }));
  });

}
