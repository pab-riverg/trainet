import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { sincronizarBusquedaConQ } from '../../../../utilidades/rutas';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, catchError, debounceTime, merge, of, startWith, switchMap, tap } from 'rxjs';
import { ComprasService } from '../../../../servicios/compras';
import { Articulo, CategoriaArticulo } from '../../../../modelos/compras';
import { formatearPrecio } from '../../../../utilidades/compras';
import { mensajeError } from '../../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../../utilidades/formularios';
import { Moneda } from '../../../../compartidos/moneda';
import { BotonAccion } from '../../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../../utilidades/paginacion';

const LIMITE_TAMANO_IMAGEN = 2 * 1024 * 1024;
const EXTENSIONES_IMAGEN = ['jpg', 'jpeg', 'png', 'webp'];

@Component({
  selector: 'app-catalogo-articulos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Moneda, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './articulos.html',
  styleUrl: './articulos.css',
})
export class CatalogoArticulos implements OnInit, OnDestroy {

  mensajeControl = mensajeControl;

  private comprasService = inject(ComprasService);

  moduloId = input.required<number>();

  imagenInput = viewChild<ElementRef<HTMLInputElement>>('imagenInput');

  formatearPrecio = formatearPrecio;

  articulos = signal<Articulo[]>([]);
  paginacion = crearPaginacion(() => this.articulos());
  cargando = signal(false);
  error = signal<string | null>(null);

  categorias = signal<CategoriaArticulo[]>([]);
  errorCategorias = signal<string | null>(null);

  private recargar$ = new Subject<void>();

  filtrosForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    categoria: new FormControl<number | null>(null),
    disponible: new FormControl<boolean | null>(null)
  });

  // Formulario de alta / edición (panel en línea).
  formularioAbierto = signal(false);
  articuloEnEdicion = signal<Articulo | null>(null);
  articuloForm = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    descripcion: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
    fo_categoria: new FormControl<number | null>(null, { validators: [Validators.required] }),
    precio_referencia: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    disponible: new FormControl(true, { nonNullable: true })
  });
  imagenSeleccionada = signal<File | null>(null);
  vistaPrevia = signal<string | null>(null);
  errorImagen = signal<string | null>(null);
  guardando = signal(false);
  errorFormulario = signal<string | null>(null);

  // Imagen mostrada en el formulario: la nueva si hay vista previa, si no la actual del artículo.
  imagenMostrada = computed(() => this.vistaPrevia() ?? this.articuloEnEdicion()?.imagen ?? null);

  cambiandoId = signal<number | null>(null);
  errorCambio = signal<string | null>(null);

  articuloPorEliminar = signal<number | null>(null);
  eliminandoId = signal<number | null>(null);
  errorEliminar = signal<string | null>(null);

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
          return this.comprasService.listarArticulos({
            search: filtros.search.trim() || undefined,
            categoria: filtros.categoria ?? undefined,
            disponible: filtros.disponible ?? undefined
          }).pipe(
            catchError(error => {
              this.error.set(mensajeError(error, 'No se pudo cargar el catálogo de artículos.'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: articulos => {
          if (articulos) {
            this.articulos.set(articulos);
          }
          this.cargando.set(false);
        },
        error: error => {
          this.error.set(mensajeError(error, 'No se pudo cargar el catálogo de artículos.'));
          this.cargando.set(false);
        }
      });
  }

  ngOnInit(): void {
    this.comprasService.listarCategorias().subscribe({
      next: categorias => this.categorias.set(categorias),
      error: error => this.errorCategorias.set(mensajeError(error, 'No se pudieron cargar las categorías.'))
    });
  }

  ngOnDestroy(): void {
    this.liberarVistaPrevia();
  }

  recargar(): void {
    this.recargar$.next();
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ search: '', categoria: null, disponible: null });
  }

  // --- Imagen ---

  private liberarVistaPrevia(): void {
    const url = this.vistaPrevia();
    if (url) {
      URL.revokeObjectURL(url);
    }
    this.vistaPrevia.set(null);
  }

  private limpiarImagen(): void {
    this.liberarVistaPrevia();
    this.imagenSeleccionada.set(null);
    this.errorImagen.set(null);
    const input = this.imagenInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  onImagenSeleccionada(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.errorImagen.set(null);
    this.liberarVistaPrevia();

    if (archivo) {
      const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
      if (!EXTENSIONES_IMAGEN.includes(extension)) {
        this.errorImagen.set('Formato no permitido. Usa JPG, PNG o WEBP.');
        this.limpiarImagen();
        return;
      }
      if (archivo.size > LIMITE_TAMANO_IMAGEN) {
        this.errorImagen.set('La imagen supera el límite de 2 MB.');
        this.limpiarImagen();
        return;
      }
      this.vistaPrevia.set(URL.createObjectURL(archivo));
    }

    this.imagenSeleccionada.set(archivo);
  }

  // --- Alta / edición ---

  abrirCrear(): void {
    this.articuloEnEdicion.set(null);
    this.errorFormulario.set(null);
    this.articuloForm.reset({ nombre: '', descripcion: '', fo_categoria: null, precio_referencia: 0, disponible: true });
    this.limpiarImagen();
    this.formularioAbierto.set(true);
  }

  abrirEditar(articulo: Articulo): void {
    this.articuloEnEdicion.set(articulo);
    this.errorFormulario.set(null);
    this.articuloForm.reset({
      nombre: articulo.nombre,
      descripcion: articulo.descripcion,
      fo_categoria: articulo.fo_categoria,
      precio_referencia: articulo.precio_referencia,
      disponible: articulo.disponible
    });
    this.limpiarImagen();
    this.formularioAbierto.set(true);
  }

  cerrarFormulario(): void {
    this.formularioAbierto.set(false);
    this.limpiarImagen();
  }

  guardar(): void {
    if (this.articuloForm.invalid) {
      marcarInvalidos(this.articuloForm);
      return;
    }

    const valores = this.articuloForm.getRawValue();
    if (this.articuloForm.invalid || valores.fo_categoria === null) {
      return;
    }

    const datos = {
      nombre: valores.nombre.trim(),
      descripcion: valores.descripcion.trim(),
      fo_categoria: valores.fo_categoria,
      precio_referencia: Math.trunc(valores.precio_referencia),
      disponible: valores.disponible
    };
    const imagen = this.imagenSeleccionada() ?? undefined;
    const edicion = this.articuloEnEdicion();

    this.guardando.set(true);
    this.errorFormulario.set(null);

    const peticion = edicion
      ? this.comprasService.actualizarArticulo(edicion.id, datos, imagen)
      : this.comprasService.crearArticulo({ ...datos, fo_mod_compras: this.moduloId() }, imagen);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.recargar();
      },
      error: error => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeError(error, 'No se pudo guardar el artículo.'));
      }
    });
  }

  // --- Interruptor "Disponible" de la tabla ---

  cambiarDisponible(articulo: Articulo, evento: Event): void {
    const interruptor = evento.target as HTMLInputElement;

    this.cambiandoId.set(articulo.id);
    this.errorCambio.set(null);

    this.comprasService.actualizarArticulo(articulo.id, { disponible: interruptor.checked }).subscribe({
      next: actualizado => {
        this.cambiandoId.set(null);
        this.articulos.update(lista => lista.map(item => (item.id === actualizado.id ? actualizado : item)));
      },
      error: error => {
        this.cambiandoId.set(null);
        interruptor.checked = articulo.disponible;
        this.errorCambio.set(mensajeError(error, 'No se pudo cambiar la disponibilidad.'));
      }
    });
  }

  // --- Eliminación ---

  pedirEliminar(articulo: Articulo): void {
    this.articuloPorEliminar.set(articulo.id);
    this.errorEliminar.set(null);
  }

  cancelarEliminar(): void {
    this.articuloPorEliminar.set(null);
  }

  confirmarEliminar(articulo: Articulo): void {
    this.eliminandoId.set(articulo.id);
    this.errorEliminar.set(null);

    this.comprasService.eliminarArticulo(articulo.id).subscribe({
      next: () => {
        this.eliminandoId.set(null);
        this.articuloPorEliminar.set(null);
        this.recargar();
      },
      error: error => {
        this.eliminandoId.set(null);
        this.articuloPorEliminar.set(null);
        this.errorEliminar.set(mensajeError(error, 'No se pudo eliminar el artículo.'));
      }
    });
  }

}
