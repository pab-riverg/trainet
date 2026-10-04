import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CapacitacionService } from '../../../servicios/capacitacion';
import { CategoriaCurso, Curso, ESTADOS_CURSO } from '../../../modelos/capacitacion';
import { ROLES_GESTION_CURSOS } from '../../../modelos/permisos-capacitacion';
import { cerrarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

function videoUrlValidator(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as string;
  if (!valor) {
    return null;
  }
  return /^https?:\/\//.test(valor) ? null : { videoUrlInvalido: true };
}

@Component({
  selector: 'app-cursos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './cursos.html'
})
export class Cursos implements OnInit {

  mensajeControl = mensajeControl;

  private capacitacionService = inject(CapacitacionService);

  moduloId = input.required<number>();

  estadosCurso = ESTADOS_CURSO;

  cursos = signal<Curso[]>([]);
  paginacion = crearPaginacion(() => this.cursos());
  cargando = signal(false);
  error = signal<string | null>(null);

  categorias = signal<CategoriaCurso[]>([]);
  errorCategorias = signal<string | null>(null);

  modoEdicion = signal<Curso | null>(null);
  guardando = signal(false);
  errorFormulario = signal<string | null>(null);

  cursoAEliminar = signal<Curso | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  mostrarFormCategoria = signal(false);
  categoriaNuevaControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  guardandoCategoriaNueva = signal(false);
  errorCategoriaNueva = signal<string | null>(null);

  private rolActual = signal(localStorage.getItem('trainet_rol'));
  puedeGestionar = computed(() => ROLES_GESTION_CURSOS.includes(this.rolActual() ?? ''));

  cursoForm = new FormGroup({
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    descripcion: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    duracion: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    estado: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    video_url: new FormControl('', { nonNullable: true, validators: [videoUrlValidator] }),
    fo_categoria_curso: new FormControl<number | null>(null, { validators: [Validators.required] })
  });

  ngOnInit(): void {
    this.cargarCursos();
    this.cargarCategorias();
  }

  cargarCursos(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.capacitacionService.listarCursos().subscribe({
      next: cursos => {
        this.cursos.set(cursos);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudo cargar la lista de cursos.'));
        this.cargando.set(false);
      }
    });
  }

  cargarCategorias(): void {
    this.errorCategorias.set(null);

    this.capacitacionService.listarCategorias().subscribe({
      next: categorias => this.categorias.set(categorias),
      error: error => this.errorCategorias.set(mensajeError(error, 'No se pudieron cargar las categorías.'))
    });
  }

  etiquetaEstado(codigo: string): string {
    return this.estadosCurso.find(opcion => opcion.codigo === codigo)?.etiqueta ?? codigo;
  }

  abrirCrear(): void {
    this.modoEdicion.set(null);
    this.errorFormulario.set(null);
    this.mostrarFormCategoria.set(false);
    this.cursoForm.reset({ titulo: '', descripcion: '', duracion: 0, estado: '', video_url: '', fo_categoria_curso: null });
  }

  abrirEditar(curso: Curso): void {
    this.modoEdicion.set(curso);
    this.errorFormulario.set(null);
    this.mostrarFormCategoria.set(false);
    this.cursoForm.reset({
      titulo: curso.titulo,
      descripcion: curso.descripcion,
      duracion: curso.duracion,
      estado: curso.estado,
      video_url: curso.video_url ?? '',
      fo_categoria_curso: curso.fo_categoria_curso
    });
  }

  abrirNuevaCategoria(): void {
    this.mostrarFormCategoria.set(true);
    this.errorCategoriaNueva.set(null);
    this.categoriaNuevaControl.reset('');
  }

  cancelarNuevaCategoria(): void {
    this.mostrarFormCategoria.set(false);
  }

  guardarNuevaCategoria(): void {
    if (this.categoriaNuevaControl.invalid) {
      this.categoriaNuevaControl.markAsTouched();
      return;
    }

    this.guardandoCategoriaNueva.set(true);
    this.errorCategoriaNueva.set(null);

    this.capacitacionService.crearCategoria(this.categoriaNuevaControl.value).subscribe({
      next: categoria => {
        this.guardandoCategoriaNueva.set(false);
        this.mostrarFormCategoria.set(false);
        this.categorias.update(lista => [...lista, categoria]);
        this.cursoForm.controls.fo_categoria_curso.setValue(categoria.id);
      },
      error: error => {
        this.guardandoCategoriaNueva.set(false);
        this.errorCategoriaNueva.set(mensajeError(error, 'No se pudo crear la categoría.'));
      }
    });
  }

  guardar(): void {
    if (this.cursoForm.invalid) {
      marcarInvalidos(this.cursoForm);
      return;
    }

    if (this.cursoForm.invalid) {
      return;
    }

    const valores = this.cursoForm.getRawValue();
    const { fo_categoria_curso, ...resto } = valores;
    if (fo_categoria_curso === null) {
      return;
    }

    this.guardando.set(true);
    this.errorFormulario.set(null);

    const datosComunes = {
      ...resto,
      video_url: resto.video_url ? resto.video_url : null,
      fo_categoria_curso
    };

    const edicion = this.modoEdicion();

    const peticion = edicion
      ? this.capacitacionService.actualizarCurso(edicion.id, datosComunes)
      : this.capacitacionService.crearCurso({ ...datosComunes, fo_mod_cap: this.moduloId() });

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        cerrarModal('modalCurso');
        this.cargarCursos();
      },
      error: error => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeError(error, 'No se pudo guardar el curso.'));
      }
    });
  }

  abrirEliminar(curso: Curso): void {
    this.cursoAEliminar.set(curso);
    this.errorEliminar.set(null);
  }

  confirmarEliminar(): void {
    const curso = this.cursoAEliminar();
    if (!curso) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.capacitacionService.eliminarCurso(curso.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        cerrarModal('modalEliminarCurso');
        this.cargarCursos();
      },
      error: error => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeError(error, 'No se pudo eliminar el curso.'));
      }
    });
  }

}
