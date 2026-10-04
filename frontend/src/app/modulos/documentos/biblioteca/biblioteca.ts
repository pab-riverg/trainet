import { NgTemplateOutlet } from '@angular/common';
import { sincronizarBusquedaConQ } from '../../../utilidades/rutas';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, debounceTime, merge, of, startWith, switchMap, tap } from 'rxjs';
import { DocumentosService } from '../../../servicios/documentos';
import { CategoriaDocumento, Documento, TipoDocumento } from '../../../modelos/documentos';
import { ROLES_GESTION_DOCUMENTOS } from '../../../modelos/permisos-documentos';
import { formatearTamano, guardarBlob } from '../../../utilidades/archivos';
import { cerrarModal, vigilarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

const LIMITE_TAMANO_ARCHIVO = 10 * 1024 * 1024;

type FormularioDestino = 'subida' | 'edicion';
type CatalogoNuevo = 'tipo' | 'categoria';

const ID_MODAL_SUBIDA = 'modalSubidaDocumento';

@Component({
  selector: 'app-biblioteca',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgTemplateOutlet, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './biblioteca.html'
})
export class Biblioteca implements OnInit {

  mensajeControl = mensajeControl;

  private documentosService = inject(DocumentosService);

  moduloId = input.required<number>();

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  formatearTamano = formatearTamano;

  documentos = signal<Documento[]>([]);
  paginacion = crearPaginacion(() => this.documentos());
  cargando = signal(false);
  error = signal<string | null>(null);
  errorAccion = signal<string | null>(null);
  accionEnCurso = signal<number | null>(null);

  tipos = signal<TipoDocumento[]>([]);
  categorias = signal<CategoriaDocumento[]>([]);
  errorCatalogos = signal<string | null>(null);

  private recargar$ = new Subject<void>();

  filtrosForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    tipo: new FormControl<number | null>(null),
    categoria: new FormControl<number | null>(null),
    fecha: new FormControl('', { nonNullable: true })
  });

  subidaForm = new FormGroup({
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    version: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    fo_tipo_documento: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fo_categoria_documento: new FormControl<number | null>(null, { validators: [Validators.required] })
  });
  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  subiendo = signal(false);
  errorSubida = signal<string | null>(null);

  documentoEnEdicion = signal<Documento | null>(null);
  edicionForm = new FormGroup({
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    version: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    fo_tipo_documento: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fo_categoria_documento: new FormControl<number | null>(null, { validators: [Validators.required] })
  });
  guardando = signal(false);
  errorEdicion = signal<string | null>(null);

  documentoAEliminar = signal<Documento | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  catalogoNuevo = signal<CatalogoNuevo | null>(null);
  formularioDestino = signal<FormularioDestino>('subida');
  nombreNuevoControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] });
  guardandoNuevo = signal(false);
  errorNuevo = signal<string | null>(null);

  private rolActual = signal(localStorage.getItem('trainet_rol'));
  puedeGestionar = computed(() => ROLES_GESTION_DOCUMENTOS.includes(this.rolActual() ?? ''));

  constructor() {
    // El modal de subida no se cierra mientras sube y, al cerrarse (Cancelar, X, Escape o clic fuera), se reinicia.
    vigilarModal(ID_MODAL_SUBIDA, { impedirCierre: () => this.subiendo(), alCerrar: () => this.reiniciarSubida() });
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
          return this.documentosService.listarDocumentos({
            search: filtros.search.trim() || undefined,
            fo_tipo_documento: filtros.tipo ?? undefined,
            fo_categoria_documento: filtros.categoria ?? undefined,
            fecha_creacion: filtros.fecha || undefined
          }).pipe(
            catchError(error => {
              this.error.set(mensajeError(error, 'No se pudo cargar la lista de documentos.'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: documentos => {
          if (documentos) {
            this.documentos.set(documentos);
          }
          this.cargando.set(false);
        },
        error: error => {
          this.error.set(mensajeError(error, 'No se pudo cargar la lista de documentos.'));
          this.cargando.set(false);
        }
      });
  }

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  private cargarCatalogos(): void {
    this.errorCatalogos.set(null);

    this.documentosService.listarTipos().subscribe({
      next: tipos => this.tipos.set(tipos),
      error: error => this.errorCatalogos.set(mensajeError(error, 'No se pudieron cargar los tipos de documento.'))
    });

    this.documentosService.listarCategorias().subscribe({
      next: categorias => this.categorias.set(categorias),
      error: error => this.errorCatalogos.set(mensajeError(error, 'No se pudieron cargar las categorías.'))
    });
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ search: '', tipo: null, categoria: null, fecha: '' });
  }

  extension(documento: Documento): string {
    const nombre = this.nombreArchivo(documento);
    const punto = nombre.lastIndexOf('.');
    return punto >= 0 ? nombre.slice(punto + 1).toUpperCase() : '—';
  }

  private nombreArchivo(documento: Documento): string {
    const ultimo = documento.archivo.split('?')[0].split('/').pop() ?? '';
    try {
      return decodeURIComponent(ultimo);
    } catch {
      return ultimo;
    }
  }

  // --- Acciones para todos los roles ---

  ver(documento: Documento): void {
    this.errorAccion.set(null);
    this.accionEnCurso.set(documento.id);

    // La ventana se abre de forma síncrona en el click para evitar el bloqueador de ventanas emergentes.
    const ventana = window.open('', '_blank');

    this.documentosService.obtenerDocumento(documento.id).subscribe({
      next: doc => {
        this.accionEnCurso.set(null);
        if (ventana) {
          ventana.location.href = doc.archivo;
        }
      },
      error: error => {
        this.accionEnCurso.set(null);
        ventana?.close();
        this.errorAccion.set(mensajeError(error, 'No se pudo abrir el documento.'));
      }
    });
  }

  descargar(documento: Documento): void {
    this.errorAccion.set(null);
    this.accionEnCurso.set(documento.id);

    this.documentosService.descargarDocumento(documento.id).subscribe({
      next: blob => {
        this.accionEnCurso.set(null);
        guardarBlob(blob, this.nombreArchivo(documento) || documento.titulo);
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo descargar el documento.'));
      }
    });
  }

  // --- Subida ---

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
    this.subidaForm.reset({ titulo: '', version: '', fo_tipo_documento: null, fo_categoria_documento: null });
    this.limpiarArchivo();
    this.errorSubida.set(null);
    this.cancelarNuevoCatalogo();
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
    const valores = this.subidaForm.getRawValue();
    if (!archivo || this.subidaForm.invalid || valores.fo_tipo_documento === null || valores.fo_categoria_documento === null) {
      return;
    }

    this.subiendo.set(true);
    this.errorSubida.set(null);

    this.documentosService.subirDocumento({
      titulo: valores.titulo,
      version: valores.version,
      archivo,
      fo_tipo_documento: valores.fo_tipo_documento,
      fo_categoria_documento: valores.fo_categoria_documento,
      fo_mod_doc: this.moduloId()
    }).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.reiniciarSubida();
        cerrarModal(ID_MODAL_SUBIDA);
        this.recargar$.next();
      },
      error: error => {
        this.subiendo.set(false);
        this.errorSubida.set(mensajeError(error, 'No se pudo subir el documento.'));
      }
    });
  }

  // --- Edición ---

  abrirEditar(documento: Documento): void {
    this.documentoEnEdicion.set(documento);
    this.errorEdicion.set(null);
    this.cancelarNuevoCatalogo();
    this.edicionForm.reset({
      titulo: documento.titulo,
      version: documento.version,
      fo_tipo_documento: documento.fo_tipo_documento,
      fo_categoria_documento: documento.fo_categoria_documento
    });
  }

  guardarEdicion(): void {
    if (this.edicionForm.invalid) {
      marcarInvalidos(this.edicionForm);
      return;
    }

    const documento = this.documentoEnEdicion();
    const valores = this.edicionForm.getRawValue();
    if (!documento || this.edicionForm.invalid || valores.fo_tipo_documento === null || valores.fo_categoria_documento === null) {
      return;
    }

    this.guardando.set(true);
    this.errorEdicion.set(null);

    this.documentosService.actualizarDocumento(documento.id, {
      titulo: valores.titulo,
      version: valores.version,
      fo_tipo_documento: valores.fo_tipo_documento,
      fo_categoria_documento: valores.fo_categoria_documento
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        cerrarModal('modalDocumento');
        this.recargar$.next();
      },
      error: error => {
        this.guardando.set(false);
        this.errorEdicion.set(mensajeError(error, 'No se pudo guardar el documento.'));
      }
    });
  }

  // --- Eliminación ---

  abrirEliminar(documento: Documento): void {
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

    this.documentosService.eliminarDocumento(documento.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        cerrarModal('modalEliminarDocumento');
        this.recargar$.next();
      },
      error: error => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeError(error, 'No se pudo eliminar el documento.'));
      }
    });
  }

  // --- Alta rápida de tipo / categoría ---

  abrirNuevoCatalogo(catalogo: CatalogoNuevo, destino: FormularioDestino): void {
    this.catalogoNuevo.set(catalogo);
    this.formularioDestino.set(destino);
    this.errorNuevo.set(null);
    this.nombreNuevoControl.reset('');
  }

  cancelarNuevoCatalogo(): void {
    this.catalogoNuevo.set(null);
  }

  guardarNuevoCatalogo(): void {
    const catalogo = this.catalogoNuevo();
    if (!catalogo || this.nombreNuevoControl.invalid) {
      this.nombreNuevoControl.markAsTouched();
      return;
    }

    const formulario = this.formularioDestino() === 'subida' ? this.subidaForm : this.edicionForm;
    const nombre = this.nombreNuevoControl.value.trim();

    this.guardandoNuevo.set(true);
    this.errorNuevo.set(null);

    if (catalogo === 'tipo') {
      this.documentosService.crearTipo(nombre).subscribe({
        next: tipo => {
          this.guardandoNuevo.set(false);
          this.catalogoNuevo.set(null);
          this.tipos.update(lista => [...lista, tipo]);
          formulario.controls.fo_tipo_documento.setValue(tipo.id);
        },
        error: error => {
          this.guardandoNuevo.set(false);
          this.errorNuevo.set(mensajeError(error, 'No se pudo crear el tipo de documento.'));
        }
      });
    } else {
      this.documentosService.crearCategoria(nombre, this.moduloId()).subscribe({
        next: categoria => {
          this.guardandoNuevo.set(false);
          this.catalogoNuevo.set(null);
          this.categorias.update(lista => [...lista, categoria]);
          formulario.controls.fo_categoria_documento.setValue(categoria.id);
        },
        error: error => {
          this.guardandoNuevo.set(false);
          this.errorNuevo.set(mensajeError(error, 'No se pudo crear la categoría.'));
        }
      });
    }
  }

}
