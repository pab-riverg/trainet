import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ContenidoInforme as Contenido } from '../../modelos/reportes';
import { formatearNumero } from '../../utilidades/reportes';
import { GraficoBarras } from '../grafico-barras/grafico-barras';

// Pinta el `contenido` común de los informes (indicadores, secciones y gráficos). Lo usan el detalle de un informe
// de Reportes y el Dashboard. Todo el texto se muestra con interpolación (escapado): puede venir de archivos de usuarios.
@Component({
  selector: 'app-contenido-informe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GraficoBarras],
  templateUrl: './contenido-informe.html',
  styleUrl: './contenido-informe.css',
})
export class ContenidoInforme {

  contenido = input.required<Contenido>();

  formatearNumero = formatearNumero;

}
