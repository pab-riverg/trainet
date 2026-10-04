import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AsistenteService } from '../../../../servicios/asistente';
import { CategoriaAsistente } from '../../../../modelos/asistente';
import { ICONOS_ASISTENTE } from '../../../../utilidades/asistente';
import { mensajeError } from '../../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../../utilidades/formularios';
import { BotonAccion } from '../../../../compartidos/boton-accion/boton-accion';
import { Paginador } from '../../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../../utilidades/paginacion';

@Component({
  selector: 'app-categorias-asistente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion, Paginador],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css',
})
export class CategoriasAsistente implements OnInit {

  mensajeControl = mensajeControl;

  private asistente = inject(AsistenteService);

  // Avisa a quien muestre el listado de preguntas que las categorías cambiaron.
  cambio = output<void>();

  iconos = ICONOS_ASISTENTE;

  categorias = signal<CategoriaAsistente[]>([]);
  paginacion = crearPaginacion(() => this.categorias());
  cargando = signal(false);
  error = signal<string | null>(null);

  formularioAbierto = signal(false);
  categoriaEnEdicion = signal<CategoriaAsistente | null>(null);
  categoriaForm = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    orden: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] })
  });
  iconoElegido = signal('bi-chat-dots');
  guardando = signal(false);
  errorFormulario = signal<string | null>(null);

  categoriaPorEliminar = signal<number | null>(null);
  eliminandoId = signal<number | null>(null);
  errorEliminar = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.asistente.listarCategorias().subscribe({
      next: categorias => {
        this.categorias.set(categorias);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudieron cargar las categorías.'));
        this.cargando.set(false);
      }
    });
  }

  private abrirFormulario(categoria: CategoriaAsistente | null): void {
    this.categoriaEnEdicion.set(categoria);
    this.errorFormulario.set(null);
    this.categoriaForm.reset({
      nombre: categoria?.nombre ?? '',
      orden: categoria?.orden ?? this.categorias().length + 1
    });
    this.iconoElegido.set(categoria?.icono ?? 'bi-chat-dots');
    this.formularioAbierto.set(true);
  }

  abrirCrear(): void {
    this.abrirFormulario(null);
  }

  abrirEditar(categoria: CategoriaAsistente): void {
    this.abrirFormulario(categoria);
  }

  cerrarFormulario(): void {
    this.formularioAbierto.set(false);
  }

  elegirIcono(clase: string): void {
    this.iconoElegido.set(clase);
  }

  guardar(): void {
    if (this.categoriaForm.invalid) {
      marcarInvalidos(this.categoriaForm);
      return;
    }

    if (this.categoriaForm.invalid) {
      return;
    }

    const valores = this.categoriaForm.getRawValue();
    const datos = { nombre: valores.nombre.trim(), icono: this.iconoElegido(), orden: valores.orden };
    const edicion = this.categoriaEnEdicion();

    this.guardando.set(true);
    this.errorFormulario.set(null);

    const peticion = edicion
      ? this.asistente.editarCategoria(edicion.id, datos)
      : this.asistente.crearCategoria(datos);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.cargar();
        this.cambio.emit();
      },
      error: error => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeError(error, 'No se pudo guardar la categoría.'));
      }
    });
  }

  pedirEliminar(categoria: CategoriaAsistente): void {
    this.categoriaPorEliminar.set(categoria.id);
    this.errorEliminar.set(null);
  }

  cancelarEliminar(): void {
    this.categoriaPorEliminar.set(null);
  }

  confirmarEliminar(categoria: CategoriaAsistente): void {
    this.eliminandoId.set(categoria.id);
    this.errorEliminar.set(null);

    this.asistente.eliminarCategoria(categoria.id).subscribe({
      next: () => {
        this.eliminandoId.set(null);
        this.categoriaPorEliminar.set(null);
        this.cargar();
        this.cambio.emit();
      },
      error: error => {
        this.eliminandoId.set(null);
        this.categoriaPorEliminar.set(null);
        // El API responde 400 si la categoría tiene preguntas: lo que tiene contenido se mueve o se desactiva.
        this.errorEliminar.set(mensajeError(
          error,
          'No se pudo eliminar la categoría. Si tiene preguntas, muévelas a otra categoría o desactívalas.'
        ));
      }
    });
  }

}
