import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TarjetaMetricas as Datos } from '../../../../modelos/inicio';
import { formatearNumero } from '../../../../utilidades/reportes';

// Cifras grandes con etiqueta; si una métrica trae `ruta`, es un enlace a su módulo.
@Component({
  selector: 'app-tarjeta-metricas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './tarjeta-metricas.html',
  styleUrls: ['../tarjeta-base.css', './tarjeta-metricas.css'],
})
export class TarjetaMetricas {

  tarjeta = input.required<Datos>();

  formatearNumero = formatearNumero;

}
