import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ComprasService } from '../../../../servicios/compras';
import { CotizacionCompra, SolicitudCompra } from '../../../../modelos/compras';
import { ROLES_APROBACION_COMPRAS } from '../../../../modelos/permisos-compras';
import { formatearPrecio } from '../../../../utilidades/compras';
import { mensajeError } from '../../../../utilidades/errores';

// Compra: el directivo o administrador confirma con una cotización (controlando el presupuesto);
// una vez comprada, muestra los datos de la compra.
@Component({
  selector: 'app-seccion-compra',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './seccion-compra.html',
})
export class SeccionCompra {

  private comprasService = inject(ComprasService);

  solicitud = input.required<SolicitudCompra>();
  cotizaciones = input<CotizacionCompra[]>([]);
  actualizada = output<SolicitudCompra>();

  formatearPrecio = formatearPrecio;

  presupuesto = signal<number | null>(null);
  errorPresupuesto = signal<string | null>(null);

  cotizacionElegidaId = signal<number | null>(null);
  comentarioControl = new FormControl('', { nonNullable: true });
  confirmando = signal(false);
  enCurso = signal(false);
  error = signal<string | null>(null);

  private rol = localStorage.getItem('trainet_rol') ?? '';

  puedeConfirmar = computed(() => ROLES_APROBACION_COMPRAS.includes(this.rol) && this.solicitud().estado === 'aprobada');
  esperaConfirmacion = computed(() => !ROLES_APROBACION_COMPRAS.includes(this.rol) && this.solicitud().estado === 'aprobada');
  yaComprada = computed(() => ['comprada', 'entregada', 'en_revision', 'recibida'].includes(this.solicitud().estado));

  cotizacionElegida = computed(() => {
    const id = this.solicitud().fo_cotizacion_elegida;
    return this.cotizaciones().find(c => c.id === id) ?? null;
  });

  seleccionada = computed(() => this.cotizaciones().find(c => c.id === this.cotizacionElegidaId()) ?? null);

  // El botón se bloquea si el monto de la cotización elegida supera el presupuesto disponible.
  superaPresupuesto = computed(() => {
    const cotizacion = this.seleccionada();
    const presupuesto = this.presupuesto();
    return !!cotizacion && presupuesto !== null && cotizacion.monto_total > presupuesto;
  });

  private idSolicitud = computed(() => this.solicitud().id);

  constructor() {
    // El presupuesto se consulta al abrir una solicitud aprobada, así refleja la última edición.
    effect(() => {
      const id = this.idSolicitud();
      const confirmable = this.puedeConfirmar();
      untracked(() => {
        this.cotizacionElegidaId.set(null);
        this.comentarioControl.reset('');
        this.confirmando.set(false);
        this.error.set(null);
        if (id && confirmable) {
          this.cargarPresupuesto();
        }
      });
    });
  }

  private cargarPresupuesto(): void {
    this.errorPresupuesto.set(null);

    this.comprasService.listarModuloCompras().subscribe({
      next: modulos => this.presupuesto.set(modulos[0]?.presupuesto_disponible ?? 0),
      error: error => this.errorPresupuesto.set(mensajeError(error, 'No se pudo consultar el presupuesto disponible.'))
    });
  }

  elegir(id: number): void {
    this.cotizacionElegidaId.set(id);
    this.confirmando.set(false);
    this.error.set(null);
  }

  pedirConfirmacion(): void {
    this.confirmando.set(true);
  }

  cancelarConfirmacion(): void {
    this.confirmando.set(false);
  }

  confirmarCompra(): void {
    const cotizacion = this.seleccionada();
    if (!cotizacion || this.superaPresupuesto()) {
      return;
    }

    this.enCurso.set(true);
    this.error.set(null);

    this.comprasService.confirmarCompra(this.solicitud().id, {
      cotizacion: cotizacion.id,
      comentario: this.comentarioControl.value.trim() || undefined
    }).subscribe({
      next: solicitud => {
        this.enCurso.set(false);
        this.confirmando.set(false);
        this.actualizada.emit(solicitud);
      },
      error: error => {
        this.enCurso.set(false);
        this.confirmando.set(false);
        this.error.set(mensajeError(error, 'No se pudo confirmar la compra.'));
        // El presupuesto pudo cambiar: se vuelve a consultar.
        this.cargarPresupuesto();
      }
    });
  }

}
