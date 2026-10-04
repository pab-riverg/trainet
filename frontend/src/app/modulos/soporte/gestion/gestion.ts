import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { sincronizarBusquedaConQ } from '../../../utilidades/rutas';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, merge, of, startWith, switchMap, tap } from 'rxjs';
import { SoporteService } from '../../../servicios/soporte';
import { CategoriaTicket, TicketSoporte } from '../../../modelos/soporte';
import { ESTADOS_TICKET, PRIORIDADES_TICKET, etiquetaEstado, etiquetaPrioridad } from '../../../utilidades/tickets';
import { mensajeError } from '../../../utilidades/errores';
import { DetalleTicket } from '../detalle-ticket/detalle-ticket';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

@Component({
  selector: 'app-gestion-tickets',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DetalleTicket, EstadoBadge, Paginador],
  templateUrl: './gestion.html',
  styleUrl: './gestion.css',
})
export class GestionTickets implements OnInit {

  private soporteService = inject(SoporteService);

  estados = ESTADOS_TICKET;
  prioridades = PRIORIDADES_TICKET;
  etiquetaEstado = etiquetaEstado;
  etiquetaPrioridad = etiquetaPrioridad;

  tickets = signal<TicketSoporte[]>([]);
  paginacion = crearPaginacion(() => this.tickets());
  cargando = signal(false);
  error = signal<string | null>(null);

  categorias = signal<CategoriaTicket[]>([]);
  errorCategorias = signal<string | null>(null);

  // Resumen sobre la lista cargada (respeta los filtros activos).
  totalAbiertos = computed(() => this.tickets().filter(t => t.estado === 'abierto').length);
  totalEnProceso = computed(() => this.tickets().filter(t => t.estado === 'en_proceso').length);
  totalResueltos = computed(() => this.tickets().filter(t => t.estado === 'resuelto').length);

  private recargar$ = new Subject<void>();

  filtrosForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    estado: new FormControl<string | null>(null),
    categoria: new FormControl<number | null>(null),
    prioridad: new FormControl<string | null>(null),
    fecha: new FormControl('', { nonNullable: true })
  });

  ticketSeleccionado = signal<TicketSoporte | null>(null);

  constructor() {
    // Precarga el filtro con ?q= (búsqueda global) antes de la primera carga de la lista.
    sincronizarBusquedaConQ(this.filtrosForm.controls.search);
    // Cualquier cambio de búsqueda o filtro vuelve a la primera página.
    this.filtrosForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
    merge(this.filtrosForm.valueChanges.pipe(debounceTime(300)), this.recargar$)
      .pipe(
        startWith(null),
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() => {
          const filtros = this.filtrosForm.getRawValue();
          return this.soporteService.listarTickets({
            search: filtros.search.trim() || undefined,
            estado: filtros.estado ?? undefined,
            fo_categoria_ticket: filtros.categoria ?? undefined,
            prioridad: filtros.prioridad ?? undefined,
            fecha_creacion: filtros.fecha || undefined
          }).pipe(
            catchError(error => {
              this.error.set(mensajeError(error, 'No se pudo cargar la lista de tickets.'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: tickets => {
          if (tickets) {
            this.tickets.set(tickets);
          }
          this.cargando.set(false);
        },
        error: error => {
          this.error.set(mensajeError(error, 'No se pudo cargar la lista de tickets.'));
          this.cargando.set(false);
        }
      });
  }

  ngOnInit(): void {
    this.soporteService.listarCategorias().subscribe({
      next: categorias => this.categorias.set(categorias),
      error: error => this.errorCategorias.set(mensajeError(error, 'No se pudieron cargar las categorías.'))
    });
  }

  recargar(): void {
    this.recargar$.next();
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ search: '', estado: null, categoria: null, prioridad: null, fecha: '' });
  }

  gestionar(ticket: TicketSoporte): void {
    this.ticketSeleccionado.set(ticket);
  }

}
