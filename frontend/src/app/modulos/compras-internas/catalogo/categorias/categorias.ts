import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComprasService } from '../../../../servicios/compras';
import { ProveedoresService } from '../../../../servicios/proveedores';
import { CategoriaArticulo } from '../../../../modelos/compras';
import { Proveedor } from '../../../../modelos/proveedores';
import { ICONOS_CATEGORIA } from '../../../../utilidades/compras';
import { mensajeError } from '../../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../../utilidades/formularios';
import { BotonAccion } from '../../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../../utilidades/paginacion';

@Component({
  selector: 'app-catalogo-categorias',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css',
})
export class CatalogoCategorias implements OnInit {

  mensajeControl = mensajeControl;

  private comprasService = inject(ComprasService);
  private proveedoresService = inject(ProveedoresService);

  iconos = ICONOS_CATEGORIA;

  categorias = signal<CategoriaArticulo[]>([]);
  paginacion = crearPaginacion(() => this.categorias());
  cargando = signal(false);
  error = signal<string | null>(null);

  proveedores = signal<Proveedor[]>([]);
  errorProveedores = signal<string | null>(null);

  // Formulario de alta / edición (panel en línea).
  formularioAbierto = signal(false);
  categoriaEnEdicion = signal<CategoriaArticulo | null>(null);
  categoriaForm = new FormGroup({
    nombre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] })
  });
  iconoElegido = signal('bi-box-seam');
  proveedoresElegidos = signal<number[]>([]);
  buscadorProveedores = new FormControl('', { nonNullable: true });
  private terminoBusqueda = signal('');
  guardando = signal(false);
  errorFormulario = signal<string | null>(null);

  proveedoresFiltrados = computed(() => {
    const termino = this.terminoBusqueda().trim().toLowerCase();
    return this.proveedores().filter(p => !termino || p.razon_social.toLowerCase().includes(termino));
  });

  categoriaPorEliminar = signal<number | null>(null);
  eliminandoId = signal<number | null>(null);
  errorEliminar = signal<string | null>(null);

  constructor() {
    this.buscadorProveedores.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(valor => this.terminoBusqueda.set(valor));
  }

  ngOnInit(): void {
    this.cargarCategorias();

    this.proveedoresService.listarProveedores().subscribe({
      next: proveedores => this.proveedores.set(proveedores),
      error: error => this.errorProveedores.set(mensajeError(error, 'No se pudo cargar la lista de proveedores.'))
    });
  }

  cargarCategorias(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.comprasService.listarCategorias().subscribe({
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

  private reiniciarFormulario(categoria: CategoriaArticulo | null): void {
    this.categoriaEnEdicion.set(categoria);
    this.errorFormulario.set(null);
    this.categoriaForm.reset({ nombre: categoria?.nombre ?? '' });
    this.iconoElegido.set(categoria?.icono ?? 'bi-box-seam');
    this.proveedoresElegidos.set(categoria ? [...categoria.proveedores] : []);
    this.buscadorProveedores.reset('');
    this.formularioAbierto.set(true);
  }

  abrirCrear(): void {
    this.reiniciarFormulario(null);
  }

  abrirEditar(categoria: CategoriaArticulo): void {
    this.reiniciarFormulario(categoria);
  }

  cerrarFormulario(): void {
    this.formularioAbierto.set(false);
  }

  elegirIcono(clase: string): void {
    this.iconoElegido.set(clase);
  }

  estaElegido(idProveedor: number): boolean {
    return this.proveedoresElegidos().includes(idProveedor);
  }

  alternarProveedor(idProveedor: number): void {
    this.proveedoresElegidos.update(ids =>
      ids.includes(idProveedor) ? ids.filter(id => id !== idProveedor) : [...ids, idProveedor]
    );
  }

  guardar(): void {
    if (this.categoriaForm.invalid) {
      marcarInvalidos(this.categoriaForm);
      return;
    }

    if (this.categoriaForm.invalid) {
      return;
    }

    const datos = {
      nombre: this.categoriaForm.controls.nombre.value.trim(),
      icono: this.iconoElegido(),
      proveedores: this.proveedoresElegidos()
    };
    const edicion = this.categoriaEnEdicion();

    this.guardando.set(true);
    this.errorFormulario.set(null);

    const peticion = edicion
      ? this.comprasService.actualizarCategoria(edicion.id, datos)
      : this.comprasService.crearCategoria(datos);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarFormulario();
        this.cargarCategorias();
      },
      error: error => {
        this.guardando.set(false);
        this.errorFormulario.set(mensajeError(error, 'No se pudo guardar la categoría.'));
      }
    });
  }

  pedirEliminar(categoria: CategoriaArticulo): void {
    this.categoriaPorEliminar.set(categoria.id);
    this.errorEliminar.set(null);
  }

  cancelarEliminar(): void {
    this.categoriaPorEliminar.set(null);
  }

  confirmarEliminar(categoria: CategoriaArticulo): void {
    this.eliminandoId.set(categoria.id);
    this.errorEliminar.set(null);

    this.comprasService.eliminarCategoria(categoria.id).subscribe({
      next: () => {
        this.eliminandoId.set(null);
        this.categoriaPorEliminar.set(null);
        this.cargarCategorias();
      },
      error: error => {
        this.eliminandoId.set(null);
        this.categoriaPorEliminar.set(null);
        this.errorEliminar.set(mensajeError(error, 'No se pudo eliminar la categoría.'));
      }
    });
  }

}
