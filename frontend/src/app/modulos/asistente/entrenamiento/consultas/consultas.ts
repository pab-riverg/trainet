import {
  ChangeDetectionStrategy, Component, ElementRef, OnInit, effect, inject, input, signal, untracked, viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { AsistenteService } from '../../../../servicios/asistente';
import { CategoriaAsistente, ConsultaFrecuente } from '../../../../modelos/asistente';
import { errorArchivoAsistente } from '../../../../utilidades/asistente';
import { guardarBlob } from '../../../../utilidades/archivos';
import { mensajeError } from '../../../../utilidades/errores';
import { abrirModal, cerrarModal } from '../../../../utilidades/modal';
import { marcarInvalidos, mensajeControl } from '../../../../utilidades/formularios';
import { BotonAccion } from '../../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../../utilidades/paginacion';

const ID_MODAL = 'modalConsultaAsistente';

// Texto que se precarga como pregunta (viene de "Sin respuesta"); `n` distingue pedidos repetidos del mismo texto.
export interface PrecargaConsulta {
  texto: string;
  n: number;
}

@Component({
  selector: 'app-consultas-asistente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './consultas.html',
})
export class ConsultasAsistente implements OnInit {

  mensajeControl = mensajeControl;

  private asistente = inject(AsistenteService);

  precarga = input<PrecargaConsulta | null>(null);

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  readonly idModal = ID_MODAL;

  consultas = signal<ConsultaFrecuente[]>([]);
  paginacion = crearPaginacion(() => this.consultas());
  categorias = signal<CategoriaAsistente[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  errorCategorias = signal<string | null>(null);

  filtrosForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    categoria: new FormControl<number | null>(null),
    activa: new FormControl<'' | 'true' | 'false'>('', { nonNullable: true })
  });

  // Alta / edición (modal).
  consultaEnEdicion = signal<ConsultaFrecuente | null>(null);
  consultaForm = new FormGroup({
    pregunta: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    respuesta: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fo_categoria: new FormControl<number | null>(null),
    palabras_clave: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
    activa: new FormControl(true, { nonNullable: true })
  });
  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  guardando = signal(false);
  errorFormulario = signal<string | null>(null);

  consultaPorEliminar = signal<number | null>(null);
  eliminandoId = signal<number | null>(null);
  errorAccion = signal<string | null>(null);

  constructor() {
    // Cambiar un filtro o la selección vuelve a la primera página.
    this.filtrosForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
    this.filtrosForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.cargar());

    // "Entrenar" desde Sin respuesta: abre el modal de nueva pregunta con el texto precargado.
    effect(() => {
      const precarga = this.precarga();
      if (precarga) {
        untracked(() => {
          this.abrirNueva(precarga.texto);
          setTimeout(() => abrirModal(ID_MODAL));
        });
      }
    });
  }

  ngOnInit(): void {
    this.cargar();

    this.asistente.listarCategorias().subscribe({
      next: categorias => this.categorias.set(categorias),
      error: error => this.errorCategorias.set(mensajeError(error, 'No se pudieron cargar las categorías.'))
    });
  }

  cargar(): void {
    const valores = this.filtrosForm.getRawValue();
    this.cargando.set(true);
    this.error.set(null);

    this.asistente.listarConsultas({
      search: valores.search.trim() || undefined,
      categoria: valores.categoria ?? undefined,
      activa: valores.activa ? valores.activa === 'true' : undefined
    }).subscribe({
      next: consultas => {
        this.consultas.set(consultas);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudieron cargar las preguntas.'));
        this.cargando.set(false);
      }
    });
  }

  // --- Modal de alta / edición ---

  abrirNueva(pregunta = ''): void {
    this.prepararFormulario(null, pregunta);
  }

  abrirEditar(consulta: ConsultaFrecuente): void {
    this.prepararFormulario(consulta, consulta.pregunta);
  }

  private prepararFormulario(consulta: ConsultaFrecuente | null, pregunta: string): void {
    this.consultaEnEdicion.set(consulta);
    this.errorFormulario.set(null);
    this.consultaForm.reset({
      pregunta,
      respuesta: consulta?.respuesta ?? '',
      fo_categoria: consulta?.fo_categoria ?? null,
      palabras_clave: consulta?.palabras_clave ?? '',
      activa: consulta?.activa ?? true
    });
    this.limpiarArchivo();
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

    if (archivo) {
      const problema = errorArchivoAsistente(archivo);
      if (problema) {
        this.limpiarArchivo();
        this.errorArchivo.set(problema);
        return;
      }
    }

    this.archivoSeleccionado.set(archivo);
  }

  guardar(): void {
    if (this.consultaForm.invalid) {
      marcarInvalidos(this.consultaForm);
      return;
    }

    if (this.consultaForm.invalid) {
      return;
    }

    const valores = this.consultaForm.getRawValue();
    const datos = {
      pregunta: valores.pregunta.trim(),
      respuesta: valores.respuesta.trim(),
      fo_categoria: valores.fo_categoria,
      palabras_clave: valores.palabras_clave.trim(),
      activa: valores.activa,
      archivo: this.archivoSeleccionado()
    };
    const edicion = this.consultaEnEdicion();

    this.guardando.set(true);
    this.errorFormulario.set(null);

    const peticion = edicion
      ? this.asistente.editarConsulta(edicion.id, datos)
      : this.asistente.crearConsulta(datos);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.limpiarArchivo();
        cerrarModal(ID_MODAL);
        this.cargar();
      },
      error: error => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeError(error, 'No se pudo guardar la pregunta.'));
      }
    });
  }

  // --- Descarga y eliminación ---

  descargar(consulta: ConsultaFrecuente): void {
    this.errorAccion.set(null);
    this.asistente.descargarArchivo(consulta.id).subscribe({
      next: blob => guardarBlob(blob, consulta.archivo_nombre ?? 'archivo'),
      error: error => this.errorAccion.set(mensajeError(error, 'No se pudo descargar el archivo.'))
    });
  }

  pedirEliminar(consulta: ConsultaFrecuente): void {
    this.consultaPorEliminar.set(consulta.id);
    this.errorAccion.set(null);
  }

  cancelarEliminar(): void {
    this.consultaPorEliminar.set(null);
  }

  confirmarEliminar(consulta: ConsultaFrecuente): void {
    this.eliminandoId.set(consulta.id);
    this.errorAccion.set(null);

    this.asistente.eliminarConsulta(consulta.id).subscribe({
      next: () => {
        this.eliminandoId.set(null);
        this.consultaPorEliminar.set(null);
        this.cargar();
      },
      error: error => {
        this.eliminandoId.set(null);
        this.consultaPorEliminar.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo eliminar la pregunta.'));
      }
    });
  }

}
