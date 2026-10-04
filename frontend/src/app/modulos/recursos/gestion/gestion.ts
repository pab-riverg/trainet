import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { sincronizarBusquedaConQ } from '../../../utilidades/rutas';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, merge, of, startWith, switchMap, tap } from 'rxjs';
import { RecursosService } from '../../../servicios/recursos';
import { SolicitudRecursos, TipoRecurso } from '../../../modelos/recursos';
import {
  ESTADOS_SOLICITUD,
  PRIORIDADES_SOLICITUD,
  etiquetaEstadoSolicitud,
  etiquetaPrioridadSolicitud
} from '../../../utilidades/pedidos';
import { mensajeError } from '../../../utilidades/errores';
import { DetallePedido } from '../detalle-pedido/detalle-pedido';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

@Component({
  selector: 'app-gestion-pedidos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DetallePedido, EstadoBadge, Paginador],
  templateUrl: './gestion.html',
  styleUrl: './gestion.css',
})
export class GestionPedidos implements OnInit {

  private recursosService = inject(RecursosService);

  estados = ESTADOS_SOLICITUD;
  prioridades = PRIORIDADES_SOLICITUD;
  etiquetaEstado = etiquetaEstadoSolicitud;
  etiquetaPrioridad = etiquetaPrioridadSolicitud;

  pedidos = signal<SolicitudRecursos[]>([]);
  paginacion = crearPaginacion(() => this.pedidos());
  cargando = signal(false);
  error = signal<string | null>(null);

  tipos = signal<TipoRecurso[]>([]);
  errorTipos = signal<string | null>(null);

  // Resumen sobre la lista cargada (respeta los filtros activos).
  totalPendientes = computed(() => this.pedidos().filter(p => p.estado === 'pendiente').length);
  totalAprobados = computed(() => this.pedidos().filter(p => p.estado === 'aprobado').length);
  totalEntregados = computed(() => this.pedidos().filter(p => p.estado === 'entregado').length);

  private recargar$ = new Subject<void>();

  filtrosForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    estado: new FormControl<string | null>(null),
    prioridad: new FormControl<string | null>(null),
    tipo: new FormControl<number | null>(null)
  });

  pedidoSeleccionado = signal<SolicitudRecursos | null>(null);

  constructor() {
    // Cambiar un filtro o la selección vuelve a la primera página.
    this.filtrosForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
    // Precarga el filtro con ?q= (búsqueda global) antes de la primera carga de la lista.
    sincronizarBusquedaConQ(this.filtrosForm.controls.search);
    merge(this.filtrosForm.valueChanges.pipe(debounceTime(300)), this.recargar$)
      .pipe(
        startWith(null),
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() => {
          const filtros = this.filtrosForm.getRawValue();
          return this.recursosService.listarSolicitudes({
            search: filtros.search.trim() || undefined,
            estado: filtros.estado ?? undefined,
            prioridad: filtros.prioridad ?? undefined,
            fo_tipo_recurso: filtros.tipo ?? undefined
          }).pipe(
            catchError(error => {
              this.error.set(mensajeError(error, 'No se pudo cargar la lista de pedidos.'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: pedidos => {
          if (pedidos) {
            this.pedidos.set(pedidos);
          }
          this.cargando.set(false);
        },
        error: error => {
          this.error.set(mensajeError(error, 'No se pudo cargar la lista de pedidos.'));
          this.cargando.set(false);
        }
      });
  }

  ngOnInit(): void {
    this.recursosService.listarTipos().subscribe({
      next: tipos => this.tipos.set(tipos),
      error: error => this.errorTipos.set(mensajeError(error, 'No se pudieron cargar los tipos de recurso.'))
    });
  }

  recargar(): void {
    this.recargar$.next();
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ search: '', estado: null, prioridad: null, tipo: null });
  }

  gestionar(pedido: SolicitudRecursos): void {
    this.pedidoSeleccionado.set(pedido);
  }

}
