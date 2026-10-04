import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { sincronizarBusquedaConQ } from '../../../utilidades/rutas';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, debounceTime, merge, of, startWith, switchMap, tap } from 'rxjs';
import { ProveedoresService } from '../../../servicios/proveedores';
import { Proveedor } from '../../../modelos/proveedores';
import { ROLES_GESTION_PROVEEDORES } from '../../../modelos/permisos-proveedores';
import { ESTADOS_PROVEEDOR, etiquetaEstadoProveedor } from '../../../utilidades/proveedores';
import { cerrarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { DetalleProveedor } from '../detalle-proveedor/detalle-proveedor';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { CampoTelefono } from '../../../compartidos/campo-telefono/campo-telefono';
import { SoloDigitos } from '../../../compartidos/solo-digitos';
import { NitPipe } from '../../../compartidos/pipes-numeros';
import { NIT_MAX, NIT_MIN, nitParaEditar } from '../../../utilidades/numeros';
import { erroresPorCampo } from '../../../utilidades/reportes';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

@Component({
  selector: 'app-directorio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DetalleProveedor, CampoTelefono, SoloDigitos, NitPipe, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './directorio.html',
  styleUrl: './directorio.css',
})
export class Directorio {

  mensajeControl = mensajeControl;

  private proveedoresService = inject(ProveedoresService);

  moduloId = input.required<number>();

  estados = ESTADOS_PROVEEDOR;
  etiquetaEstado = etiquetaEstadoProveedor;

  proveedores = signal<Proveedor[]>([]);
  paginacion = crearPaginacion(() => this.proveedores());
  cargando = signal(false);
  error = signal<string | null>(null);

  private recargar$ = new Subject<void>();

  filtrosForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    estado: new FormControl<string | null>(null),
    especialidad: new FormControl('', { nonNullable: true })
  });

  proveedorForm = new FormGroup({
    razon_social: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    rut: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(NIT_MIN), Validators.maxLength(NIT_MAX), Validators.pattern(/^\d+$/)] }),
    especialidad: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    contacto: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(255)] }),
    telefono: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    estado: new FormControl('sin_contratar', { nonNullable: true })
  });
  proveedorEnEdicion = signal<Proveedor | null>(null);
  guardando = signal(false);
  errorFormulario = signal<string | null>(null);

  proveedorSeleccionado = signal<Proveedor | null>(null);

  proveedorAEliminar = signal<Proveedor | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  puedeGestionar = computed(() => ROLES_GESTION_PROVEEDORES.includes(localStorage.getItem('trainet_rol') ?? ''));

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
          return this.proveedoresService.listarProveedores({
            search: filtros.search.trim() || undefined,
            estado: filtros.estado ?? undefined,
            especialidad: filtros.especialidad.trim() || undefined
          }).pipe(
            catchError(error => {
              this.error.set(mensajeError(error, 'No se pudo cargar el directorio de proveedores.'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: proveedores => {
          if (proveedores) {
            this.proveedores.set(proveedores);
          }
          this.cargando.set(false);
        },
        error: error => {
          this.error.set(mensajeError(error, 'No se pudo cargar el directorio de proveedores.'));
          this.cargando.set(false);
        }
      });
  }

  recargar(): void {
    this.recargar$.next();
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ search: '', estado: null, especialidad: '' });
  }

  verProveedor(proveedor: Proveedor): void {
    this.proveedorSeleccionado.set(proveedor);
  }

  abrirCrear(): void {
    this.proveedorEnEdicion.set(null);
    this.errorFormulario.set(null);
    this.erroresApi.set({});
    this.proveedorForm.reset({ razon_social: '', rut: '', especialidad: '', contacto: '', email: '', telefono: '', estado: 'sin_contratar' });
  }

  abrirEditar(proveedor: Proveedor): void {
    this.proveedorEnEdicion.set(proveedor);
    this.errorFormulario.set(null);
    this.erroresApi.set({});
    this.proveedorForm.reset({
      razon_social: proveedor.razon_social,
      // El NIT se edita como número sin formato (los datos antiguos pueden traer puntos o guiones).
      rut: nitParaEditar(proveedor.rut),
      especialidad: proveedor.especialidad,
      contacto: proveedor.contacto,
      email: proveedor.email,
      telefono: proveedor.telefono,
      estado: proveedor.estado
    });
  }

  erroresApi = signal<Record<string, string>>({});

  guardar(): void {
    if (this.proveedorForm.invalid) {
      marcarInvalidos(this.proveedorForm);
      return;
    }

    if (this.proveedorForm.invalid) {
      return;
    }

    const { estado, ...datos } = this.proveedorForm.getRawValue();
    const edicion = this.proveedorEnEdicion();

    this.guardando.set(true);
    this.errorFormulario.set(null);
    this.erroresApi.set({});

    const peticion = edicion
      ? this.proveedoresService.actualizarProveedor(edicion.id, { ...datos, estado: estado as Proveedor['estado'] })
      : this.proveedoresService.crearProveedor({ ...datos, fo_mod_prov: this.moduloId() });

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        cerrarModal('modalProveedor');
        this.recargar();
      },
      error: error => {
        this.guardando.set(false);
        // Errores 400 de teléfono y NIT (campo rut) bajo su campo.
        const errores = erroresPorCampo(error, ['telefono', 'rut'], 'No se pudo guardar el proveedor.');
        this.erroresApi.set(errores.porCampo);
        this.errorFormulario.set(errores.general);
      }
    });
  }

  abrirEliminar(proveedor: Proveedor): void {
    this.proveedorAEliminar.set(proveedor);
    this.errorEliminar.set(null);
  }

  confirmarEliminar(): void {
    const proveedor = this.proveedorAEliminar();
    if (!proveedor) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.proveedoresService.eliminarProveedor(proveedor.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        cerrarModal('modalEliminarProveedor');
        this.recargar();
      },
      error: error => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeError(error, 'No se pudo eliminar el proveedor.'));
      }
    });
  }

}
