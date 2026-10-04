import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TarjetaLista as Datos } from '../../../../modelos/inicio';
import { EstadoBadge } from '../../../../compartidos/estado-badge/estado-badge';

// Mensaje amable cuando la lista está vacía, según la tarjeta; el resto usa un texto genérico.
const MENSAJES_VACIO: Record<string, string> = {
  mis_tickets: 'No tienes tickets abiertos.',
  mis_pedidos: 'Aún no has hecho pedidos.',
  tickets_sin_atender: 'No hay tickets sin atender. ¡Buen trabajo!',
  cursos_y_aprendices: 'Todavía no hay cursos con aprendices.',
  documentos_recientes: 'Aún no hay documentos en la biblioteca.',
  actividad_reciente: 'Todavía no hay actividad registrada.'
};

// Hasta 5 elementos con título, subtítulo e insignia de estado; cada uno enlaza a su módulo.
@Component({
  selector: 'app-tarjeta-lista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EstadoBadge],
  templateUrl: './tarjeta-lista.html',
  styleUrls: ['../tarjeta-base.css', './tarjeta-lista.css'],
})
export class TarjetaLista {

  tarjeta = input.required<Datos>();

  mensajeVacio = computed(() => MENSAJES_VACIO[this.tarjeta().clave] ?? 'No hay elementos para mostrar.');

  // Cuántos elementos quedan sin mostrar (total real menos los visibles).
  restantes = computed(() => Math.max(0, this.tarjeta().total - this.tarjeta().items.length));

}
