import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { SoporteService } from '../../../servicios/soporte';
import { EvidenciaTicket, TecnicoSoporte, TicketSoporte } from '../../../modelos/soporte';
import { ROLES_GESTION_TICKETS, ROLES_REASIGNAR_TICKETS } from '../../../modelos/permisos-soporte';
import { ESTADOS_TICKET, etiquetaEstado, etiquetaPrioridad } from '../../../utilidades/tickets';
import { cerrarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';

const LIMITE_TAMANO_ARCHIVO = 10 * 1024 * 1024;

@Component({
  selector: 'app-detalle-ticket',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion, EstadoBadge],
  templateUrl: './detalle-ticket.html',
  styleUrl: './detalle-ticket.css',
})
export class DetalleTicket implements OnInit {

  mensajeControl = mensajeControl;

  private soporteService = inject(SoporteService);

  ticket = input<TicketSoporte | null>(null);
  modoGestion = input(false);
  actualizado = output<void>();

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  estadosTicket = ESTADOS_TICKET;
  etiquetaEstado = etiquetaEstado;
  etiquetaPrioridad = etiquetaPrioridad;

  // Copia local: se refresca con la respuesta del PATCH sin esperar a que el padre recargue.
  ticketActual = signal<TicketSoporte | null>(null);

  evidencias = signal<EvidenciaTicket[]>([]);
  cargandoEvidencias = signal(false);
  errorEvidencias = signal<string | null>(null);

  tecnicos = signal<TecnicoSoporte[]>([]);
  errorTecnicos = signal<string | null>(null);

  gestionForm = new FormGroup({
    estado: new FormControl('', { nonNullable: true }),
    observaciones: new FormControl('', { nonNullable: true }),
    fo_tecnico: new FormControl<number | null>(null)
  });
  guardando = signal(false);
  errorGuardar = signal<string | null>(null);
  mensajeGuardado = signal<string | null>(null);

  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  subiendo = signal(false);
  errorSubida = signal<string | null>(null);

  eliminandoEvidencia = signal<number | null>(null);
  errorEliminarEvidencia = signal<string | null>(null);

  private rolActual = signal(localStorage.getItem('trainet_rol'));
  private idActual = Number(localStorage.getItem('trainet_id'));

  puedeGestionar = computed(() => this.modoGestion() && ROLES_GESTION_TICKETS.includes(this.rolActual() ?? ''));
  puedeReasignar = computed(() => this.puedeGestionar() && ROLES_REASIGNAR_TICKETS.includes(this.rolActual() ?? ''));
  puedeEliminarEvidencia = computed(() =>
    ROLES_GESTION_TICKETS.includes(this.rolActual() ?? '') || this.ticketActual()?.fo_usuario === this.idActual
  );
  estadoConocido = computed(() => this.estadosTicket.some(e => e.codigo === this.ticketActual()?.estado));

  constructor() {
    effect(() => {
      const ticket = this.ticket();
      this.ticketActual.set(ticket);
      this.errorGuardar.set(null);
      this.mensajeGuardado.set(null);
      this.errorSubida.set(null);
      this.errorEliminarEvidencia.set(null);
      this.limpiarArchivo();

      if (ticket) {
        this.gestionForm.reset({
          estado: ticket.estado,
          observaciones: ticket.observaciones,
          fo_tecnico: ticket.fo_tecnico
        });
        this.cargarEvidencias(ticket.id);
      } else {
        this.evidencias.set([]);
      }
    });
  }

  ngOnInit(): void {
    if (ROLES_REASIGNAR_TICKETS.includes(this.rolActual() ?? '')) {
      this.soporteService.listarTecnicos().subscribe({
        next: tecnicos => this.tecnicos.set(tecnicos),
        error: error => this.errorTecnicos.set(mensajeError(error, 'No se pudo cargar la lista de técnicos.'))
      });
    }
  }

  private cargarEvidencias(idTicket: number): void {
    this.cargandoEvidencias.set(true);
    this.errorEvidencias.set(null);

    this.soporteService.listarEvidencias(idTicket).subscribe({
      next: evidencias => {
        this.evidencias.set(evidencias);
        this.cargandoEvidencias.set(false);
      },
      error: error => {
        this.errorEvidencias.set(mensajeError(error, 'No se pudieron cargar las evidencias.'));
        this.cargandoEvidencias.set(false);
      }
    });
  }

  nombreArchivo(evidencia: EvidenciaTicket): string {
    const ultimo = evidencia.archivo.split('?')[0].split('/').pop() ?? '';
    try {
      return decodeURIComponent(ultimo);
    } catch {
      return ultimo;
    }
  }

  // --- Gestión (estado, observaciones, técnico) ---

  guardar(): void {
    if (this.gestionForm.invalid) {
      marcarInvalidos(this.gestionForm);
      return;
    }

    const ticket = this.ticketActual();
    if (!ticket || !this.puedeGestionar()) {
      return;
    }

    const valores = this.gestionForm.getRawValue();
    const cambios: { estado?: string; observaciones?: string; fo_tecnico?: number | null } = {};

    if (valores.estado !== ticket.estado) {
      cambios.estado = valores.estado;
    }
    if (valores.observaciones !== ticket.observaciones) {
      cambios.observaciones = valores.observaciones;
    }
    if (this.puedeReasignar() && valores.fo_tecnico !== ticket.fo_tecnico) {
      cambios.fo_tecnico = valores.fo_tecnico;
    }

    if (Object.keys(cambios).length === 0) {
      this.mensajeGuardado.set('No hay cambios por guardar.');
      return;
    }

    this.guardando.set(true);
    this.errorGuardar.set(null);
    this.mensajeGuardado.set(null);

    this.soporteService.actualizarTicket(ticket.id, cambios).subscribe({
      next: actualizado => {
        this.guardando.set(false);
        this.ticketActual.set(actualizado);
        this.gestionForm.reset({
          estado: actualizado.estado,
          observaciones: actualizado.observaciones,
          fo_tecnico: actualizado.fo_tecnico
        });
        this.mensajeGuardado.set('Cambios guardados.');
        this.actualizado.emit();
      },
      error: error => {
        this.guardando.set(false);
        this.errorGuardar.set(mensajeError(error, 'No se pudo actualizar el ticket.'));
      }
    });
  }

  // --- Evidencias ---

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
      this.errorArchivo.set('El archivo supera el límite de 10 MB.');
      this.limpiarArchivo();
      return;
    }

    this.archivoSeleccionado.set(archivo);
  }

  subirEvidencia(): void {
    const ticket = this.ticketActual();
    const archivo = this.archivoSeleccionado();
    if (!ticket || !archivo) {
      return;
    }

    this.subiendo.set(true);
    this.errorSubida.set(null);

    this.soporteService.subirEvidencia(archivo, ticket.id).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.limpiarArchivo();
        this.cargarEvidencias(ticket.id);
        this.actualizado.emit();
      },
      error: error => {
        this.subiendo.set(false);
        this.errorSubida.set(mensajeError(error, 'No se pudo subir la evidencia.'));
      }
    });
  }

  eliminarEvidencia(evidencia: EvidenciaTicket): void {
    const ticket = this.ticketActual();
    if (!ticket) {
      return;
    }

    this.eliminandoEvidencia.set(evidencia.id);
    this.errorEliminarEvidencia.set(null);

    this.soporteService.eliminarEvidencia(evidencia.id).subscribe({
      next: () => {
        this.eliminandoEvidencia.set(null);
        this.cargarEvidencias(ticket.id);
        this.actualizado.emit();
      },
      error: error => {
        this.eliminandoEvidencia.set(null);
        this.errorEliminarEvidencia.set(mensajeError(error, 'No se pudo eliminar la evidencia.'));
      }
    });
  }

  cerrar(): void {
    cerrarModal('modalDetalleTicket');
  }

}
