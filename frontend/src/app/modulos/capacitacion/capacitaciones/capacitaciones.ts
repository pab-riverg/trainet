import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CapacitacionService } from '../../../servicios/capacitacion';
import { Capacitacion, Capacitador, Curso, MODALIDADES } from '../../../modelos/capacitacion';
import { ROLES_GESTION_CAPACITACIONES } from '../../../modelos/permisos-capacitacion';
import { cerrarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

function fechaFinNoAnteriorValidator(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('fecha_inicio')?.value as string;
  const fin = grupo.get('fecha_fin')?.value as string;
  if (!inicio || !fin) {
    return null;
  }
  return fin < inicio ? { fechaFinAnterior: true } : null;
}

@Component({
  selector: 'app-capacitaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion, Paginador],
  templateUrl: './capacitaciones.html',
  styleUrl: './capacitaciones.css',
})
export class Capacitaciones implements OnInit {

  mensajeControl = mensajeControl;

  private capacitacionService = inject(CapacitacionService);

  moduloId = input.required<number>();

  modalidades = MODALIDADES;

  capacitaciones = signal<Capacitacion[]>([]);
  paginacion = crearPaginacion(() => this.capacitaciones());
  cargando = signal(false);
  error = signal<string | null>(null);

  cursos = signal<Curso[]>([]);
  capacitadores = signal<Capacitador[]>([]);
  errorCatalogos = signal<string | null>(null);
  hayDatosDisponibles = computed(() => this.cursos().length > 0 && this.capacitadores().length > 0);

  modoEdicion = signal<Capacitacion | null>(null);
  guardando = signal(false);
  errorFormulario = signal<string | null>(null);

  capacitacionAEliminar = signal<Capacitacion | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  private rolActual = signal(localStorage.getItem('trainet_rol'));
  puedeGestionar = computed(() => ROLES_GESTION_CAPACITACIONES.includes(this.rolActual() ?? ''));

  capacitacionForm = new FormGroup({
    fo_curso: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fo_instructor: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fecha_inicio: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fecha_fin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    modalidad: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  }, { validators: fechaFinNoAnteriorValidator });

  ngOnInit(): void {
    this.cargarCapacitaciones();
    this.cargarCatalogos();
  }

  cargarCapacitaciones(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.capacitacionService.listarCapacitaciones().subscribe({
      next: lista => {
        this.capacitaciones.set(lista);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudo cargar la lista de capacitaciones.'));
        this.cargando.set(false);
      }
    });
  }

  cargarCatalogos(): void {
    this.errorCatalogos.set(null);

    this.capacitacionService.listarCursos().subscribe({
      next: cursos => this.cursos.set(cursos),
      error: error => this.errorCatalogos.set(mensajeError(error, 'No se pudieron cargar los cursos disponibles.'))
    });

    this.capacitacionService.listarCapacitadores().subscribe({
      next: capacitadores => this.capacitadores.set(capacitadores),
      error: error => this.errorCatalogos.set(mensajeError(error, 'No se pudieron cargar los capacitadores disponibles.'))
    });
  }

  etiquetaModalidad(codigo: string): string {
    return this.modalidades.find(opcion => opcion.codigo === codigo)?.etiqueta ?? codigo;
  }

  abrirCrear(): void {
    this.modoEdicion.set(null);
    this.errorFormulario.set(null);
    this.capacitacionForm.reset({
      fo_curso: null,
      fo_instructor: null,
      fecha_inicio: '',
      fecha_fin: '',
      modalidad: ''
    });
  }

  abrirEditar(capacitacion: Capacitacion): void {
    this.modoEdicion.set(capacitacion);
    this.errorFormulario.set(null);
    this.capacitacionForm.reset({
      fo_curso: capacitacion.fo_curso,
      fo_instructor: capacitacion.fo_instructor,
      fecha_inicio: capacitacion.fecha_inicio,
      fecha_fin: capacitacion.fecha_fin,
      modalidad: capacitacion.modalidad
    });
  }

  guardar(): void {
    if (this.capacitacionForm.invalid) {
      marcarInvalidos(this.capacitacionForm);
      return;
    }

    if (this.capacitacionForm.invalid) {
      return;
    }

    const valores = this.capacitacionForm.getRawValue();
    const { fo_curso, fo_instructor, ...resto } = valores;
    if (fo_curso === null || fo_instructor === null) {
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);

    const datosComunes = { ...resto, fo_curso, fo_instructor };
    const edicion = this.modoEdicion();

    const peticion = edicion
      ? this.capacitacionService.actualizarCapacitacion(edicion.id, datosComunes)
      : this.capacitacionService.crearCapacitacion({ ...datosComunes, fo_mod_cap: this.moduloId() });

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        cerrarModal('modalCapacitacion');
        this.cargarCapacitaciones();
      },
      error: error => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeError(error, 'No se pudo guardar la capacitación.'));
      }
    });
  }

  abrirEliminar(capacitacion: Capacitacion): void {
    this.capacitacionAEliminar.set(capacitacion);
    this.errorEliminar.set(null);
  }

  confirmarEliminar(): void {
    const capacitacion = this.capacitacionAEliminar();
    if (!capacitacion) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.capacitacionService.eliminarCapacitacion(capacitacion.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        cerrarModal('modalEliminarCapacitacion');
        this.cargarCapacitaciones();
      },
      error: error => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeError(error, 'No se pudo eliminar la capacitación.'));
      }
    });
  }

}
