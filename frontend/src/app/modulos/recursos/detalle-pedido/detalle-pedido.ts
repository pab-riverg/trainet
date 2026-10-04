import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RecursosService, SolicitudDecision } from '../../../servicios/recursos';
import { SolicitudRecursos } from '../../../modelos/recursos';
import { ROLES_GESTION_RECURSOS } from '../../../modelos/permisos-recursos';
import {
  etiquetaEstadoSolicitud,
  etiquetaPrioridadSolicitud
} from '../../../utilidades/pedidos';
import { mensajeError } from '../../../utilidades/errores';
import { Moneda } from '../../../compartidos/moneda';
import { formatearPrecio } from '../../../utilidades/compras';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';

const LIMITE_TAMANO_ARCHIVO = 20 * 1024 * 1024;

@Component({
  selector: 'app-detalle-pedido',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Moneda, EstadoBadge],
  templateUrl: './detalle-pedido.html',
  styleUrl: './detalle-pedido.css',
})
export class DetallePedido {

  private recursosService = inject(RecursosService);

  pedido = input<SolicitudRecursos | null>(null);
  modoGestion = input(false);
  actualizado = output<void>();

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  etiquetaEstado = etiquetaEstadoSolicitud;
  etiquetaPrioridad = etiquetaPrioridadSolicitud;

  // Copia local: se refresca con la respuesta de cada acción sin esperar a que el padre recargue.
  pedidoActual = signal<SolicitudRecursos | null>(null);

  comentarioControl = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] });
  formatearPrecio = formatearPrecio;

  presupuestoControl = new FormControl<number | null>(null, { validators: [Validators.min(0)] });

  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);

  enCurso = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  puedeGestionar = computed(
    () => this.modoGestion() && ROLES_GESTION_RECURSOS.includes(localStorage.getItem('trainet_rol') ?? '')
  );

  constructor() {
    effect(() => {
      this.pedidoActual.set(this.pedido());
      this.comentarioControl.reset('');
      this.presupuestoControl.reset(null);
      this.error.set(null);
      this.mensaje.set(null);
      this.limpiarArchivo();
    });
  }

  private limpiarArchivo(): void {
    this.archivoSeleccionado.set(null);
    this.errorArchivo.set(null);
    const input = this.archivoInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.errorArchivo.set(null);

    if (archivo && archivo.size > LIMITE_TAMANO_ARCHIVO) {
      this.errorArchivo.set('El archivo supera el límite de 20 MB.');
      this.limpiarArchivo();
      return;
    }

    this.archivoSeleccionado.set(archivo);
  }

  private iniciarAccion(): void {
    this.enCurso.set(true);
    this.error.set(null);
    this.mensaje.set(null);
  }

  private terminarAccion(actualizada: SolicitudRecursos, mensaje: string): void {
    this.enCurso.set(false);
    this.pedidoActual.set(actualizada);
    this.mensaje.set(mensaje);
    this.comentarioControl.reset('');
    this.presupuestoControl.reset(null);
    this.limpiarArchivo();
    this.actualizado.emit();
  }

  private fallarAccion(error: unknown, porDefecto: string): void {
    this.enCurso.set(false);
    this.error.set(mensajeError(error, porDefecto));
  }

  confirmarDisponibilidad(): void {
    const pedido = this.pedidoActual();
    if (!pedido) {
      return;
    }

    this.iniciarAccion();

    this.recursosService.confirmarDisponibilidad(pedido.id).subscribe({
      next: actualizada => {
        const resultado = actualizada.tipo_disponible ? 'está disponible' : 'NO está disponible por ahora';
        this.terminarAccion(actualizada, `El recurso ${resultado}. Se notificó al solicitante.`);
      },
      error: error => this.fallarAccion(error, 'No se pudo confirmar la disponibilidad.')
    });
  }

  aprobar(): void {
    this.decidir('aprobado');
  }

  rechazar(): void {
    this.decidir('rechazado');
  }

  private decidir(estado: 'aprobado' | 'rechazado'): void {
    const pedido = this.pedidoActual();
    if (!pedido || this.comentarioControl.invalid || this.presupuestoControl.invalid) {
      return;
    }

    const comentario = this.comentarioControl.value.trim();
    if (estado === 'rechazado' && !comentario) {
      this.error.set('El comentario es obligatorio para rechazar un pedido.');
      this.mensaje.set(null);
      return;
    }

    const datos: SolicitudDecision = { estado, comentario_encargado: comentario };
    const presupuesto = this.presupuestoControl.value;
    if (presupuesto !== null) {
      datos.presupuesto_estimado = presupuesto;
    }

    this.iniciarAccion();

    this.recursosService.decidirSolicitud(pedido.id, datos).subscribe({
      next: actualizada => this.terminarAccion(
        actualizada,
        estado === 'aprobado' ? 'Pedido aprobado. Se notificó al solicitante.' : 'Pedido rechazado. Se notificó al solicitante.'
      ),
      error: error => this.fallarAccion(error, 'No se pudo registrar la decisión.')
    });
  }

  entregar(): void {
    const pedido = this.pedidoActual();
    const archivo = this.archivoSeleccionado();
    if (!pedido || !archivo) {
      return;
    }

    this.iniciarAccion();

    this.recursosService.entregarSolicitud(pedido.id, archivo).subscribe({
      next: actualizada => this.terminarAccion(actualizada, 'Pedido entregado. Se notificó al solicitante.'),
      error: error => this.fallarAccion(error, 'No se pudo registrar la entrega.')
    });
  }

}
