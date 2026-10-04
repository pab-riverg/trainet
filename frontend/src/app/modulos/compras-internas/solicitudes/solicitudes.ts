import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { sincronizarBusquedaConQ } from '../../../utilidades/rutas';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, debounceTime, merge, of, startWith, switchMap, tap } from 'rxjs';
import { ComprasService } from '../../../servicios/compras';
import { ModuloCompras, SolicitudCompra } from '../../../modelos/compras';
import { ROLES_PRESUPUESTO_COMPRAS } from '../../../modelos/permisos-compras';
import { ESTADOS_SOLICITUD_COMPRA, etiquetaEstadoCompra, formatearPrecio } from '../../../utilidades/compras';
import { mensajeError } from '../../../utilidades/errores';
import { DetalleSolicitud } from '../detalle-solicitud/detalle-solicitud';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { Moneda } from '../../../compartidos/moneda';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

// Lista de solicitudes: "propias" (Mis solicitudes) o "todas" (Solicitudes, para aprobar y gestionar).
@Component({
  selector: 'app-lista-solicitudes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DetalleSolicitud, Moneda, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.css',
})
export class ListaSolicitudes implements OnInit {

  mensajeControl = mensajeControl;

  private comprasService = inject(ComprasService);

  modo = input<'propias' | 'todas'>('propias');

  estados = ESTADOS_SOLICITUD_COMPRA;
  etiquetaEstado = etiquetaEstadoCompra;
  formatearPrecio = formatearPrecio;

  solicitudes = signal<SolicitudCompra[]>([]);
  paginacion = crearPaginacion(() => this.solicitudes());
  cargando = signal(false);
  error = signal<string | null>(null);

  esTodas = computed(() => this.modo() === 'todas');

  private recargar$ = new Subject<void>();

  filtrosForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    estado: new FormControl<string | null>(null)
  });

  solicitudSeleccionada = signal<SolicitudCompra | null>(null);

  // Presupuesto disponible del módulo (se muestra arriba en la pestaña "Solicitudes").
  modulo = signal<ModuloCompras | null>(null);
  errorPresupuesto = signal<string | null>(null);
  editandoPresupuesto = signal(false);
  presupuestoControl = new FormControl<number | null>(0, { validators: [Validators.required, Validators.min(0)] });
  // El <form> necesita [formGroup]: sin él, (ngSubmit) no se dispara y el navegador envía el formulario de forma nativa.
  presupuestoForm = new FormGroup({ valor: this.presupuestoControl });
  guardandoPresupuesto = signal(false);
  exitoPresupuesto = signal<string | null>(null);

  puedeEditarPresupuesto = ROLES_PRESUPUESTO_COMPRAS.includes(localStorage.getItem('trainet_rol') ?? '');

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
          return this.comprasService.listarSolicitudes({
            estado: filtros.estado ?? undefined,
            search: filtros.search.trim() || undefined
          }).pipe(
            catchError(error => {
              this.error.set(mensajeError(error, 'No se pudo cargar la lista de solicitudes.'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: solicitudes => {
          if (solicitudes) {
            this.solicitudes.set(solicitudes);
          }
          this.cargando.set(false);
        },
        error: error => {
          this.error.set(mensajeError(error, 'No se pudo cargar la lista de solicitudes.'));
          this.cargando.set(false);
        }
      });
  }

  ngOnInit(): void {
    if (this.esTodas()) {
      this.cargarPresupuesto();
    }
  }

  private cargarPresupuesto(): void {
    this.errorPresupuesto.set(null);

    this.comprasService.listarModuloCompras().subscribe({
      next: modulos => this.modulo.set(modulos[0] ?? null),
      error: error => this.errorPresupuesto.set(mensajeError(error, 'No se pudo consultar el presupuesto disponible.'))
    });
  }

  editarPresupuesto(): void {
    this.presupuestoControl.setValue(this.modulo()?.presupuesto_disponible ?? 0);
    this.errorPresupuesto.set(null);
    this.exitoPresupuesto.set(null);
    this.editandoPresupuesto.set(true);
  }

  cancelarEdicionPresupuesto(): void {
    this.editandoPresupuesto.set(false);
  }

  guardarPresupuesto(): void {
    if (this.presupuestoForm.invalid) {
      marcarInvalidos(this.presupuestoForm);
      return;
    }

    const modulo = this.modulo();
    const valor = Number(this.presupuestoControl.value);
    if (!modulo) {
      return;
    }
    // Se explica por qué no se envía, en lugar de quedarse en silencio.
    if (this.presupuestoControl.value === null || this.presupuestoControl.invalid || !Number.isFinite(valor)) {
      this.errorPresupuesto.set('Ingresa un número entero de 0 o más.');
      this.exitoPresupuesto.set(null);
      return;
    }

    this.guardandoPresupuesto.set(true);
    this.errorPresupuesto.set(null);
    this.exitoPresupuesto.set(null);

    this.comprasService.actualizarPresupuesto(modulo.id, Math.trunc(valor)).subscribe({
      next: actualizado => {
        this.guardandoPresupuesto.set(false);
        // Se muestra lo que devuelve el servidor, no lo que escribió el usuario.
        this.modulo.set(actualizado);
        this.editandoPresupuesto.set(false);
        this.exitoPresupuesto.set('Presupuesto actualizado.');
      },
      error: error => {
        this.guardandoPresupuesto.set(false);
        this.errorPresupuesto.set(mensajeError(error, 'No se pudo actualizar el presupuesto.'));
      }
    });
  }

  recargar(): void {
    this.recargar$.next();
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ search: '', estado: null });
  }

  ver(solicitud: SolicitudCompra): void {
    // Copia nueva: así el modal vuelve a pedir el detalle aunque se abra la misma solicitud otra vez.
    this.solicitudSeleccionada.set({ ...solicitud });
  }

}
