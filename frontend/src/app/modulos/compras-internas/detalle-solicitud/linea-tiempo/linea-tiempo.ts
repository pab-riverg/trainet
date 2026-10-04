import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { EventoSolicitud } from '../../../../modelos/compras';
import { EVENTOS_SOLICITUD } from '../../../../utilidades/compras';

// Bitácora de la solicitud: lista vertical cronológica.
@Component({
  selector: 'app-linea-tiempo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <section class="border-top pt-3" aria-label="Historial de la solicitud">
      <h6>Historial</h6>

      @if (eventos().length === 0) {
        <p class="text-muted small mb-0">Aún no hay eventos registrados.</p>
      } @else {
        <ol class="linea">
          @for (evento of eventos(); track evento.id) {
            <li>
              <span class="linea-icono" aria-hidden="true">
                <i class="bi {{ info(evento.tipo).icono }}"></i>
              </span>
              <div>
                <div class="fw-semibold">{{ info(evento.tipo).etiqueta }}</div>
                @if (evento.detalle) {
                  <div class="small">{{ evento.detalle }}</div>
                }
                <div class="small text-muted">
                  {{ evento.usuario_nombre || 'Sistema' }} · {{ evento.fecha | date: 'dd/MM/yyyy HH:mm' }}
                </div>
              </div>
            </li>
          }
        </ol>
      }
    </section>
  `,
  styles: `
    .linea {
      list-style: none;
      margin: 0;
      padding: 0 0 0 .25rem;
      border-left: 2px solid var(--app-borde);
    }

    .linea li {
      display: flex;
      gap: .75rem;
      padding: 0 0 .9rem .75rem;
      position: relative;
      margin-left: .25rem;
    }

    /* Nombres o correos largos no empujan el contenido. */
    .linea li > div {
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .linea-icono {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      margin-left: -1.6rem;
      border-radius: 50%;
      background: var(--app-destacada);
      color: #fff;
      font-size: .8rem;
    }
  `,
})
export class LineaTiempo {

  eventos = input<EventoSolicitud[]>([]);

  info(tipo: string): { etiqueta: string; icono: string } {
    return EVENTOS_SOLICITUD[tipo] ?? { etiqueta: tipo, icono: 'bi-circle' };
  }

}
