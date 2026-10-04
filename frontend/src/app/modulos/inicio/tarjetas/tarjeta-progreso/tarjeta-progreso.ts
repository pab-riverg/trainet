import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TarjetaProgreso as Datos } from '../../../../modelos/inicio';
import { EstadoBadge } from '../../../../compartidos/estado-badge/estado-badge';

// Elemento destacado con su estado y una barra de progreso accesible (role="progressbar").
@Component({
  selector: 'app-tarjeta-progreso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EstadoBadge],
  templateUrl: './tarjeta-progreso.html',
  styleUrls: ['../tarjeta-base.css', './tarjeta-progreso.css'],
})
export class TarjetaProgreso {

  tarjeta = input.required<Datos>();

  // El porcentaje se acota a 0–100 para que la barra nunca se desborde.
  porcentaje = computed(() => Math.min(100, Math.max(0, Math.round(this.tarjeta().item.porcentaje))));

}
