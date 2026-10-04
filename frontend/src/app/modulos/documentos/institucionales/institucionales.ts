import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DocumentosService } from '../../../servicios/documentos';
import { DocumentoInstitucional } from '../../../modelos/documentos';
import { ROLES_GESTION_INSTITUCIONALES } from '../../../modelos/permisos-documentos';
import { cerrarModal, vigilarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

const LIMITE_TAMANO_ARCHIVO = 10 * 1024 * 1024;

const ID_MODAL_SUBIDA = 'modalSubidaInstitucional';

@Component({
  selector: 'app-institucionales',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion, Paginador],
  templateUrl: './institucionales.html'
})
export class Institucionales implements OnInit {

  mensajeControl = mensajeControl;

  private documentosService = inject(DocumentosService);

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  documentos = signal<DocumentoInstitucional[]>([]);
  paginacion = crearPaginacion(() => this.documentos());
  cargando = signal(false);
  error = signal<string | null>(null);

  subidaForm = new FormGroup({
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    descripcion: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] })
  });
  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  subiendo = signal(false);
  errorSubida = signal<string | null>(null);

  documentoAEliminar = signal<DocumentoInstitucional | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  private rolActual = signal(localStorage.getItem('trainet_rol'));
  puedeGestionar = computed(() => ROLES_GESTION_INSTITUCIONALES.includes(this.rolActual() ?? ''));

  constructor() {
    // El modal de subida no se cierra mientras sube y, al cerrarse (Cancelar, X, Escape o clic fuera), se reinicia.
    vigilarModal(ID_MODAL_SUBIDA, { impedirCierre: () => this.subiendo(), alCerrar: () => this.reiniciarSubida() });
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.documentosService.listarInstitucionales().subscribe({
      next: documentos => {
        this.documentos.set(documentos);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudieron cargar los documentos institucionales.'));
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

  // Abre el modal de subida (el formulario ya está reiniciado desde el último cierre).
  abrirSubida(): void {
    this.errorSubida.set(null);
  }

  // Deja el formulario de subida como nuevo: campos, selector de archivo, mensajes y alta rápida de catálogo.
  private reiniciarSubida(): void {
    this.subidaForm.reset({ titulo: '', descripcion: '' });
    this.limpiarArchivo();
    this.errorSubida.set(null);
  }

  subir(): void {
    // Sin doble envío: mientras sube se ignora cualquier otro intento.
    if (this.subiendo()) {
      return;
    }

    const sinArchivo = !this.archivoSeleccionado();
    if (this.subidaForm.invalid || sinArchivo) {
      marcarInvalidos(this.subidaForm);
      if (sinArchivo) {
        this.errorArchivo.set('Selecciona un archivo.');
      }
      return;
    }

    const archivo = this.archivoSeleccionado();
    if (!archivo || this.subidaForm.invalid) {
      return;
    }

    const { titulo, descripcion } = this.subidaForm.getRawValue();
    this.subiendo.set(true);
    this.errorSubida.set(null);

    this.documentosService.subirInstitucional(titulo, descripcion, archivo).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.reiniciarSubida();
        cerrarModal(ID_MODAL_SUBIDA);
        this.cargar();
      },
      error: error => {
        this.subiendo.set(false);
        this.errorSubida.set(mensajeError(error, 'No se pudo subir el documento institucional.'));
      }
    });
  }

  abrirEliminar(documento: DocumentoInstitucional): void {
    this.documentoAEliminar.set(documento);
    this.errorEliminar.set(null);
  }

  confirmarEliminar(): void {
    const documento = this.documentoAEliminar();
    if (!documento) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.documentosService.eliminarInstitucional(documento.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        cerrarModal('modalEliminarInstitucional');
        this.cargar();
      },
      error: error => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeError(error, 'No se pudo eliminar el documento institucional.'));
      }
    });
  }

}
