import { NgTemplateOutlet } from '@angular/common';
import { sincronizarBusquedaConQ } from '../../utilidades/rutas';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, debounceTime, merge, of, startWith, switchMap, tap } from 'rxjs';
import { InventarioService } from '../../servicios/inventario';
import { CategoriaContenido, Contenido, EstadoContenido, TipoContenido } from '../../modelos/inventario';
import { ROLES_GESTION_CONTENIDO } from '../../modelos/permisos-inventario';
import { guardarBlob } from '../../utilidades/archivos';
import { cerrarModal, vigilarModal } from '../../utilidades/modal';
import { mensajeError } from '../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../utilidades/formularios';
import { BotonAccion } from '../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../utilidades/paginacion';

const LIMITE_TAMANO_ARCHIVO = 50 * 1024 * 1024;

type FormularioDestino = 'subida' | 'edicion';
type CatalogoNuevo = 'categoria' | 'estado';
type Vista = 'lista' | 'categoria';

interface TipoOpcion {
  codigo: TipoContenido;
  etiqueta: string;
  icono: string;
}

interface GrupoCategoria {
  nombre: string;
  contenidos: Contenido[];
}

export const TIPOS_CONTENIDO: TipoOpcion[] = [
  { codigo: 'video', etiqueta: 'Video', icono: 'bi-camera-video' },
  { codigo: 'pdf', etiqueta: 'PDF', icono: 'bi-file-earmark-pdf' },
  { codigo: 'presentacion', etiqueta: 'Presentación', icono: 'bi-file-earmark-slides' },
  { codigo: 'manual', etiqueta: 'Manual', icono: 'bi-journal-text' },
  { codigo: 'otro', etiqueta: 'Otro', icono: 'bi-file-earmark' }
];

const ID_MODAL_SUBIDA = 'modalSubidaContenido';

@Component({
  selector: 'app-inventario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgTemplateOutlet, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
})
export class Inventario implements OnInit {

  mensajeControl = mensajeControl;

  private inventarioService = inject(InventarioService);

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');
  reemplazoInput = viewChild<ElementRef<HTMLInputElement>>('reemplazoInput');

  tiposContenido = TIPOS_CONTENIDO;

  cargandoModulo = signal(true);
  errorModulo = signal<string | null>(null);
  moduloId = signal<number | null>(null);

  vista = signal<Vista>('lista');

  contenidos = signal<Contenido[]>([]);
  paginacion = crearPaginacion(() => this.contenidos());
  cargando = signal(false);
  error = signal<string | null>(null);
  errorAccion = signal<string | null>(null);
  accionEnCurso = signal<number | null>(null);

  categorias = signal<CategoriaContenido[]>([]);
  estados = signal<EstadoContenido[]>([]);
  errorCatalogos = signal<string | null>(null);

  grupos = computed<GrupoCategoria[]>(() => {
    const porCategoria = new Map<string, Contenido[]>();
    for (const contenido of this.contenidos()) {
      const nombre = contenido.categoria_nombre || 'Sin categoría';
      porCategoria.set(nombre, [...(porCategoria.get(nombre) ?? []), contenido]);
    }
    return [...porCategoria.entries()]
      .map(([nombre, contenidos]) => ({ nombre, contenidos }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  private recargar$ = new Subject<void>();

  filtrosForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    tipo: new FormControl<string | null>(null),
    categoria: new FormControl<number | null>(null),
    estado: new FormControl<number | null>(null),
    fecha: new FormControl('', { nonNullable: true })
  });

  subidaForm = new FormGroup({
    nombre_contenido: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    tipo_contenido: new FormControl<TipoContenido>('otro', { nonNullable: true, validators: [Validators.required] }),
    fo_categoria_cont: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fo_estado_cont: new FormControl<number | null>(null, { validators: [Validators.required] })
  });
  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  subiendo = signal(false);
  errorSubida = signal<string | null>(null);

  contenidoEnEdicion = signal<Contenido | null>(null);
  edicionForm = new FormGroup({
    nombre_contenido: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    tipo_contenido: new FormControl<TipoContenido>('otro', { nonNullable: true, validators: [Validators.required] }),
    fo_categoria_cont: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fo_estado_cont: new FormControl<number | null>(null, { validators: [Validators.required] })
  });
  reemplazoSeleccionado = signal<File | null>(null);
  errorReemplazo = signal<string | null>(null);
  guardando = signal(false);
  errorEdicion = signal<string | null>(null);

  contenidoAEliminar = signal<Contenido | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  catalogoNuevo = signal<CatalogoNuevo | null>(null);
  formularioDestino = signal<FormularioDestino>('subida');
  nombreNuevoControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] });
  guardandoNuevo = signal(false);
  errorNuevo = signal<string | null>(null);

  private rolActual = signal(localStorage.getItem('trainet_rol'));
  puedeGestionar = computed(() => ROLES_GESTION_CONTENIDO.includes(this.rolActual() ?? ''));

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
          return this.inventarioService.listarContenidos({
            search: filtros.search.trim() || undefined,
            tipo_contenido: filtros.tipo ?? undefined,
            fo_categoria_cont: filtros.categoria ?? undefined,
            fo_estado_cont: filtros.estado ?? undefined,
            fecha_creacion: filtros.fecha || undefined
          }).pipe(
            catchError(error => {
              this.error.set(mensajeError(error, 'No se pudo cargar el inventario de contenido.'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: contenidos => {
          if (contenidos) {
            this.contenidos.set(contenidos);
          }
          this.cargando.set(false);
        },
        error: error => {
          this.error.set(mensajeError(error, 'No se pudo cargar el inventario de contenido.'));
          this.cargando.set(false);
        }
      });
  }

  ngOnInit(): void {
    this.inventarioService.listarModuloInventario().subscribe({
      next: modulos => {
        const primero = modulos[0];
        if (!primero) {
          this.errorModulo.set('El módulo de inventario no está configurado.');
          this.cargandoModulo.set(false);
          return;
        }
        this.moduloId.set(primero.id);
        this.cargandoModulo.set(false);
      },
      error: error => {
        this.errorModulo.set(mensajeError(error, 'El módulo de inventario no está configurado.'));
        this.cargandoModulo.set(false);
      }
    });

    this.cargarCatalogos();
  }

  private cargarCatalogos(): void {
    this.errorCatalogos.set(null);

    this.inventarioService.listarCategorias().subscribe({
      next: categorias => this.categorias.set(categorias),
      error: error => this.errorCatalogos.set(mensajeError(error, 'No se pudieron cargar las categorías.'))
    });

    this.inventarioService.listarEstados().subscribe({
      next: estados => this.estados.set(estados),
      error: error => this.errorCatalogos.set(mensajeError(error, 'No se pudieron cargar los estados.'))
    });
  }

  cambiarVista(vista: Vista): void {
    this.vista.set(vista);
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ search: '', tipo: null, categoria: null, estado: null, fecha: '' });
  }

  tipoOpcion(codigo: string): TipoOpcion {
    return this.tiposContenido.find(t => t.codigo === codigo) ?? this.tiposContenido[this.tiposContenido.length - 1];
  }

  fueActualizado(contenido: Contenido): boolean {
    return contenido.fecha_actualizacion !== contenido.fecha_creacion;
  }

  private nombreArchivo(contenido: Contenido): string {
    const ultimo = contenido.archivo.split('?')[0].split('/').pop() ?? '';
    try {
      return decodeURIComponent(ultimo);
    } catch {
      return ultimo;
    }
  }

  descargar(contenido: Contenido): void {
    this.errorAccion.set(null);
    this.accionEnCurso.set(contenido.id);

    this.inventarioService.descargarContenido(contenido.id).subscribe({
      next: blob => {
        this.accionEnCurso.set(null);
        guardarBlob(blob, this.nombreArchivo(contenido) || contenido.nombre_contenido);
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo descargar el contenido.'));
      }
    });
  }

  // --- Subida ---

  private sugerirTipo(archivo: File): TipoContenido {
    const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
    if (['mp4', 'webm', 'mov'].includes(extension)) {
      return 'video';
    }
    if (extension === 'pdf') {
      return 'pdf';
    }
    if (['ppt', 'pptx'].includes(extension)) {
      return 'presentacion';
    }
    if (['doc', 'docx'].includes(extension)) {
      return 'manual';
    }
    return 'otro';
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
      this.errorArchivo.set('El archivo supera el límite de 50 MB.');
      this.limpiarArchivo();
      return;
    }

    this.archivoSeleccionado.set(archivo);
    if (archivo) {
      this.subidaForm.controls.tipo_contenido.setValue(this.sugerirTipo(archivo));
    }
  }

  // Abre el modal de subida (el formulario ya está reiniciado desde el último cierre).
  abrirSubida(): void {
    this.errorSubida.set(null);
  }

  // Deja el formulario de subida como nuevo: campos, selector de archivo, mensajes y alta rápida de catálogo.
  private reiniciarSubida(): void {
    this.subidaForm.reset({ nombre_contenido: '', tipo_contenido: 'otro', fo_categoria_cont: null, fo_estado_cont: null });
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
    if (!archivo || this.subidaForm.invalid || valores.fo_categoria_cont === null || valores.fo_estado_cont === null || this.moduloId() === null) {
      return;
    }

    this.subiendo.set(true);
    this.errorSubida.set(null);

    this.inventarioService.subirContenido({
      nombre_contenido: valores.nombre_contenido,
      tipo_contenido: valores.tipo_contenido,
      archivo,
      fo_categoria_cont: valores.fo_categoria_cont,
      fo_estado_cont: valores.fo_estado_cont,
      fo_mod_inv: this.moduloId() as number
    }).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.reiniciarSubida();
        cerrarModal(ID_MODAL_SUBIDA);
        this.recargar$.next();
      },
      error: error => {
        this.subiendo.set(false);
        this.errorSubida.set(mensajeError(error, 'No se pudo subir el contenido.'));
      }
    });
  }

  // --- Edición y reemplazo ---

  private limpiarReemplazo(): void {
    this.reemplazoSeleccionado.set(null);
    this.errorReemplazo.set(null);
    const input = this.reemplazoInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  onReemplazoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.errorReemplazo.set(null);

    if (archivo && archivo.size > LIMITE_TAMANO_ARCHIVO) {
      this.errorReemplazo.set('El archivo supera el límite de 50 MB.');
      this.limpiarReemplazo();
      return;
    }

    this.reemplazoSeleccionado.set(archivo);
  }

  abrirEditar(contenido: Contenido): void {
    this.contenidoEnEdicion.set(contenido);
    this.errorEdicion.set(null);
    this.cancelarNuevoCatalogo();
    this.limpiarReemplazo();
    this.edicionForm.reset({
      nombre_contenido: contenido.nombre_contenido,
      tipo_contenido: contenido.tipo_contenido,
      fo_categoria_cont: contenido.fo_categoria_cont,
      fo_estado_cont: contenido.fo_estado_cont
    });
  }

  guardarEdicion(): void {
    if (this.edicionForm.invalid) {
      marcarInvalidos(this.edicionForm);
      return;
    }

    const contenido = this.contenidoEnEdicion();
    const valores = this.edicionForm.getRawValue();
    if (!contenido || this.edicionForm.invalid || valores.fo_categoria_cont === null || valores.fo_estado_cont === null) {
      return;
    }

    this.guardando.set(true);
    this.errorEdicion.set(null);

    this.inventarioService.actualizarContenido(contenido.id, {
      nombre_contenido: valores.nombre_contenido,
      tipo_contenido: valores.tipo_contenido,
      fo_categoria_cont: valores.fo_categoria_cont,
      fo_estado_cont: valores.fo_estado_cont
    }, this.reemplazoSeleccionado() ?? undefined).subscribe({
      next: () => {
        this.guardando.set(false);
        this.limpiarReemplazo();
        cerrarModal('modalContenido');
        this.recargar$.next();
      },
      error: error => {
        this.guardando.set(false);
        this.errorEdicion.set(mensajeError(error, 'No se pudo guardar el contenido.'));
      }
    });
  }

  // --- Eliminación ---

  abrirEliminar(contenido: Contenido): void {
    this.contenidoAEliminar.set(contenido);
    this.errorEliminar.set(null);
  }

  confirmarEliminar(): void {
    const contenido = this.contenidoAEliminar();
    if (!contenido) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.inventarioService.eliminarContenido(contenido.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        cerrarModal('modalEliminarContenido');
        this.recargar$.next();
      },
      error: error => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeError(error, 'No se pudo eliminar el contenido.'));
      }
    });
  }

  // --- Alta rápida de categoría / estado ---

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

    if (catalogo === 'categoria') {
      this.inventarioService.crearCategoria(nombre).subscribe({
        next: categoria => {
          this.guardandoNuevo.set(false);
          this.catalogoNuevo.set(null);
          this.categorias.update(lista => [...lista, categoria]);
          formulario.controls.fo_categoria_cont.setValue(categoria.id);
        },
        error: error => {
          this.guardandoNuevo.set(false);
          this.errorNuevo.set(mensajeError(error, 'No se pudo crear la categoría.'));
        }
      });
    } else {
      this.inventarioService.crearEstado(nombre).subscribe({
        next: estado => {
          this.guardandoNuevo.set(false);
          this.catalogoNuevo.set(null);
          this.estados.update(lista => [...lista, estado]);
          formulario.controls.fo_estado_cont.setValue(estado.id);
        },
        error: error => {
          this.guardandoNuevo.set(false);
          this.errorNuevo.set(mensajeError(error, 'No se pudo crear el estado.'));
        }
      });
    }
  }

}
