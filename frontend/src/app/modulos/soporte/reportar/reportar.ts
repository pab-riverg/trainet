import { ChangeDetectionStrategy, Component, ElementRef, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SoporteService } from '../../../servicios/soporte';
import { CategoriaTicket, TicketSoporte } from '../../../modelos/soporte';
import { PRIORIDADES_TICKET, etiquetaEstado, etiquetaPrioridad } from '../../../utilidades/tickets';
import { mensajeError } from '../../../utilidades/errores';
import { DetalleTicket } from '../detalle-ticket/detalle-ticket';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

const LIMITE_TAMANO_ARCHIVO = 10 * 1024 * 1024;

@Component({
  selector: 'app-mis-tickets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DetalleTicket, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './reportar.html',
  styleUrl: './reportar.css',
})
export class MisTickets implements OnInit {

  mensajeControl = mensajeControl;

  private soporteService = inject(SoporteService);
  private route = inject(ActivatedRoute);

  moduloId = input.required<number>();

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  prioridades = PRIORIDADES_TICKET;
  etiquetaEstado = etiquetaEstado;
  etiquetaPrioridad = etiquetaPrioridad;

  private idActual = Number(localStorage.getItem('trainet_id'));

  tickets = signal<TicketSoporte[]>([]);
  paginacion = crearPaginacion(() => this.tickets());
  cargando = signal(false);
  error = signal<string | null>(null);

  categorias = signal<CategoriaTicket[]>([]);
  errorCategorias = signal<string | null>(null);

  ticketForm = new FormGroup({
    descripcion: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    prioridad: new FormControl('media', { nonNullable: true, validators: [Validators.required] }),
    fo_categoria_ticket: new FormControl<number | null>(null, { validators: [Validators.required] })
  });
  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  enviando = signal(false);
  errorEnvio = signal<string | null>(null);
  avisoEnvio = signal<string | null>(null);
  exitoEnvio = signal<string | null>(null);

  ticketSeleccionado = signal<TicketSoporte | null>(null);

  ngOnInit(): void {
    // Precarga opcional desde el asistente Triny (?descripcion=…): solo rellena el campo, el usuario decide si envía.
    const descripcion = this.route.snapshot.queryParamMap.get('descripcion');
    if (descripcion) {
      this.ticketForm.controls.descripcion.setValue(descripcion.slice(0, 255));
    }

    this.cargarTickets();

    this.soporteService.listarCategorias().subscribe({
      next: categorias => this.categorias.set(categorias),
      error: error => this.errorCategorias.set(mensajeError(error, 'No se pudieron cargar las categorías.'))
    });
  }

  cargarTickets(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.soporteService.listarTickets().subscribe({
      next: tickets => {
        // Administradores y técnicos reciben más tickets que los suyos; aquí solo se muestran los propios.
        this.tickets.set(tickets.filter(ticket => ticket.fo_usuario === this.idActual));
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudo cargar la lista de tickets.'));
        this.cargando.set(false);
      }
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
      this.errorArchivo.set('El archivo supera el límite de 10 MB.');
      this.limpiarArchivo();
      return;
    }

    this.archivoSeleccionado.set(archivo);
  }

  enviar(): void {
    if (this.ticketForm.invalid) {
      marcarInvalidos(this.ticketForm);
      return;
    }

    const valores = this.ticketForm.getRawValue();
    if (this.ticketForm.invalid || valores.fo_categoria_ticket === null) {
      return;
    }

    this.enviando.set(true);
    this.errorEnvio.set(null);
    this.avisoEnvio.set(null);
    this.exitoEnvio.set(null);

    const archivo = this.archivoSeleccionado();

    this.soporteService.crearTicket({
      descripcion: valores.descripcion,
      prioridad: valores.prioridad,
      fo_categoria_ticket: valores.fo_categoria_ticket,
      fo_mod_soporte: this.moduloId()
    }).subscribe({
      next: ticket => {
        this.ticketForm.reset({ descripcion: '', prioridad: 'media', fo_categoria_ticket: null });

        if (!archivo) {
          this.finalizarEnvio(`Ticket #${ticket.id} creado.`, null);
          return;
        }

        this.soporteService.subirEvidencia(archivo, ticket.id).subscribe({
          next: () => this.finalizarEnvio(`Ticket #${ticket.id} creado con su evidencia.`, null),
          error: error => this.finalizarEnvio(
            null,
            `El ticket #${ticket.id} se creó, pero la evidencia no se pudo subir: ${mensajeError(error, 'error desconocido')} ` +
            'Puedes adjuntarla desde el detalle del ticket.'
          )
        });
      },
      error: error => {
        this.enviando.set(false);
        this.errorEnvio.set(mensajeError(error, 'No se pudo crear el ticket.'));
      }
    });
  }

  private finalizarEnvio(exito: string | null, aviso: string | null): void {
    this.enviando.set(false);
    this.exitoEnvio.set(exito);
    this.avisoEnvio.set(aviso);
    this.limpiarArchivo();
    this.cargarTickets();
  }

  verTicket(ticket: TicketSoporte): void {
    this.ticketSeleccionado.set(ticket);
  }

}
