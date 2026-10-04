import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComprasService } from '../../../servicios/compras';
import { CotizacionCompra, SolicitudCompra } from '../../../modelos/compras';
import {
  ROLES_APROBACION_COMPRAS,
  ROLES_VER_TODAS_SOLICITUDES
} from '../../../modelos/permisos-compras';
import { etiquetaEstadoLarga, formatearPrecio } from '../../../utilidades/compras';
import { cerrarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { LineaTiempo } from './linea-tiempo/linea-tiempo';
import { SeccionCompra } from './seccion-compra/seccion-compra';
import { SeccionCotizaciones } from './seccion-cotizaciones/seccion-cotizaciones';
import { SeccionEntrega } from './seccion-entrega/seccion-entrega';
import { SeccionObservaciones } from './seccion-observaciones/seccion-observaciones';
import { SeccionFacturas } from './seccion-facturas/seccion-facturas';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';

const ESTADOS_CON_COTIZACIONES = ['aprobada', 'comprada', 'entregada', 'en_revision', 'recibida'];
const ESTADOS_CON_FACTURAS = ['comprada', 'entregada', 'en_revision', 'recibida'];

// Modal de detalle compartido por "Mis solicitudes" y "Solicitudes". Es la carcasa: carga la solicitud
// completa (con su bitácora), resuelve la decisión inicial y delega cada etapa en una sección hija.
@Component({
  selector: 'app-detalle-solicitud',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, SeccionCotizaciones, SeccionCompra, SeccionFacturas, SeccionEntrega, LineaTiempo,
    SeccionObservaciones, EstadoBadge],
  templateUrl: './detalle-solicitud.html',
  styleUrl: './detalle-solicitud.css',
})
export class DetalleSolicitud {

  private comprasService = inject(ComprasService);

  solicitud = input<SolicitudCompra | null>(null);
  cambio = output<void>();

  etiquetaEstado = etiquetaEstadoLarga;
  formatearPrecio = formatearPrecio;

  // Copia local: se reemplaza con la respuesta de cada acción (que ya trae la bitácora actualizada).
  solicitudActual = signal<SolicitudCompra | null>(null);
  cargandoDetalle = signal(false);
  errorDetalle = signal<string | null>(null);

  cotizaciones = signal<CotizacionCompra[]>([]);
  cargandoCotizaciones = signal(false);
  errorCotizaciones = signal<string | null>(null);

  motivoControl = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] });
  enCurso = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  confirmandoCancelar = signal(false);

  private rol = localStorage.getItem('trainet_rol') ?? '';
  private idActual = Number(localStorage.getItem('trainet_id'));

  veTodas = ROLES_VER_TODAS_SOLICITUDES.includes(this.rol);

  puedeDecidir = computed(
    () => ROLES_APROBACION_COMPRAS.includes(this.rol) && this.solicitudActual()?.estado === 'pendiente'
  );

  esperaDecision = computed(
    () => this.veTodas && !ROLES_APROBACION_COMPRAS.includes(this.rol) && this.solicitudActual()?.estado === 'pendiente'
  );

  puedeCancelar = computed(() => {
    const solicitud = this.solicitudActual();
    return !!solicitud && solicitud.estado === 'pendiente' && solicitud.fo_solicitante === this.idActual;
  });

  // El solicitante nunca pide cotizaciones (el backend responde 403): solo roles que ven todas.
  mostrarCotizaciones = computed(
    () => this.veTodas && ESTADOS_CON_COTIZACIONES.includes(this.solicitudActual()?.estado ?? '')
  );

  mostrarFacturas = computed(() => ESTADOS_CON_FACTURAS.includes(this.solicitudActual()?.estado ?? ''));

  constructor() {
    // Cada vez que el padre abre una solicitud (aunque sea la misma) se muestra lo que ya hay y se pide el
    // detalle completo. Las acciones internas no vuelven a disparar esto: reemplazan solicitudActual.
    effect(() => {
      const resumen = this.solicitud();
      const id = resumen?.id ?? null;
      untracked(() => {
        this.solicitudActual.set(resumen);
        this.cotizaciones.set([]);
        this.motivoControl.reset('');
        this.error.set(null);
        this.mensaje.set(null);
        this.errorDetalle.set(null);
        this.confirmandoCancelar.set(false);
        if (id !== null) {
          this.cargarDetalle(id);
        }
      });
    });
  }

  private cargarDetalle(id: number): void {
    this.cargandoDetalle.set(true);

    this.comprasService.obtenerSolicitud(id).subscribe({
      next: solicitud => {
        this.cargandoDetalle.set(false);
        this.solicitudActual.set(solicitud);
        this.cargarCotizaciones();
      },
      error: error => {
        this.cargandoDetalle.set(false);
        this.errorDetalle.set(mensajeError(error, 'No se pudo cargar el detalle de la solicitud.'));
      }
    });
  }

  cargarCotizaciones(): void {
    const solicitud = this.solicitudActual();
    if (!solicitud || !this.mostrarCotizaciones()) {
      return;
    }

    this.cargandoCotizaciones.set(true);
    this.errorCotizaciones.set(null);

    this.comprasService.listarCotizaciones(solicitud.id).subscribe({
      next: cotizaciones => {
        this.cotizaciones.set(cotizaciones);
        this.cargandoCotizaciones.set(false);
      },
      error: error => {
        this.errorCotizaciones.set(mensajeError(error, 'No se pudieron cargar las cotizaciones.'));
        this.cargandoCotizaciones.set(false);
      }
    });
  }

  // Una etapa devolvió la solicitud actualizada: se refresca el modal y la lista del padre.
  alActualizar(solicitud: SolicitudCompra): void {
    this.solicitudActual.set(solicitud);
    this.cargarCotizaciones();
    this.cambio.emit();
  }

  aprobar(): void {
    this.decidir('aprobada');
  }

  rechazar(): void {
    this.decidir('rechazada');
  }

  // El motivo es obligatorio siempre, también al aprobar.
  private decidir(estado: 'aprobada' | 'rechazada'): void {
    const solicitud = this.solicitudActual();
    const motivo = this.motivoControl.value.trim();
    if (!solicitud) {
      return;
    }
    if (!motivo) {
      this.error.set('El motivo es obligatorio para aprobar o rechazar una solicitud.');
      this.mensaje.set(null);
      return;
    }

    this.enCurso.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    this.comprasService.decidirSolicitud(solicitud.id, { estado, motivo }).subscribe({
      next: actualizada => {
        this.enCurso.set(false);
        this.motivoControl.reset('');
        this.mensaje.set(estado === 'aprobada' ? 'Solicitud aprobada. Se notificó al solicitante.' : 'Solicitud rechazada. Se notificó al solicitante.');
        this.alActualizar(actualizada);
      },
      error: error => {
        this.enCurso.set(false);
        this.error.set(mensajeError(error, 'No se pudo registrar la decisión.'));
      }
    });
  }

  pedirCancelar(): void {
    this.confirmandoCancelar.set(true);
  }

  noCancelar(): void {
    this.confirmandoCancelar.set(false);
  }

  confirmarCancelar(): void {
    const solicitud = this.solicitudActual();
    if (!solicitud) {
      return;
    }

    this.enCurso.set(true);
    this.error.set(null);

    this.comprasService.cancelarSolicitud(solicitud.id).subscribe({
      next: () => {
        this.enCurso.set(false);
        this.confirmandoCancelar.set(false);
        cerrarModal('modalDetalleSolicitud');
        this.cambio.emit();
      },
      error: error => {
        this.enCurso.set(false);
        this.confirmandoCancelar.set(false);
        this.error.set(mensajeError(error, 'No se pudo cancelar la solicitud.'));
      }
    });
  }

}
