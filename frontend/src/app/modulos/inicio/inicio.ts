import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { InicioService } from '../../servicios/inicio';
import { TarjetaLista } from './tarjetas/tarjeta-lista/tarjeta-lista';
import { TarjetaMetricas } from './tarjetas/tarjeta-metricas/tarjeta-metricas';
import { TarjetaProgreso } from './tarjetas/tarjeta-progreso/tarjeta-progreso';
import { TarjetaTriny } from './tarjetas/tarjeta-triny/tarjeta-triny';
import { EstadoBadge } from '../../compartidos/estado-badge/estado-badge';

// Página Inicio: cuadrícula de tarjetas que declara el backend para el rol. Aquí no hay lógica de roles:
// cada tarjeta se pinta según su `tipo`.
@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TarjetaMetricas, TarjetaLista, TarjetaProgreso, TarjetaTriny, EstadoBadge],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit {

  inicio = inject(InicioService);

  readonly hoy = new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  ngOnInit(): void {
    // Cada vez que se entra se refrescan las tarjetas.
    this.inicio.cargar(true);
  }

  reintentar(): void {
    this.inicio.cargar(true);
  }

}
