import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { sincronizarBusquedaConQ } from '../../../utilidades/rutas';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { catchError, debounceTime, of, startWith, switchMap, tap } from 'rxjs';
import { ComprasService } from '../../../servicios/compras';
import { CarritoService } from '../../../servicios/carrito';
import { Articulo, CategoriaArticulo } from '../../../modelos/compras';
import { formatearPrecio } from '../../../utilidades/compras';
import { mensajeError } from '../../../utilidades/errores';

const DURACION_AVISO_MS = 1400;

@Component({
  selector: 'app-tienda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './tienda.html',
  styleUrl: './tienda.css',
})
export class Tienda implements OnInit {

  private comprasService = inject(ComprasService);
  carrito = inject(CarritoService);

  irACarrito = output<void>();

  formatearPrecio = formatearPrecio;

  articulos = signal<Articulo[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  categorias = signal<CategoriaArticulo[]>([]);
  errorCategorias = signal<string | null>(null);

  // Artículo que acaba de agregarse: el botón cambia un instante como aviso visual.
  recienAgregado = signal<number | null>(null);

  filtrosForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    categoria: new FormControl<number | null>(null)
  });

  constructor() {
    // Precarga el filtro con ?q= (búsqueda global) antes de la primera carga de la lista.
    sincronizarBusquedaConQ(this.filtrosForm.controls.search);
    this.filtrosForm.valueChanges
      .pipe(
        debounceTime(300),
        startWith(null),
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() => {
          const filtros = this.filtrosForm.getRawValue();
          return this.comprasService.listarArticulos({
            search: filtros.search.trim() || undefined,
            categoria: filtros.categoria ?? undefined
          }).pipe(
            catchError(error => {
              this.error.set(mensajeError(error, 'No se pudo cargar el catálogo.'));
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
          this.error.set(mensajeError(error, 'No se pudo cargar el catálogo.'));
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

  elegirCategoria(id: number | null): void {
    this.filtrosForm.controls.categoria.setValue(id);
  }

  agregar(articulo: Articulo): void {
    this.carrito.agregar(articulo);
    this.recienAgregado.set(articulo.id);
    setTimeout(() => {
      if (this.recienAgregado() === articulo.id) {
        this.recienAgregado.set(null);
      }
    }, DURACION_AVISO_MS);
  }

  restar(articulo: Articulo): void {
    const actual = this.carrito.cantidadDe(articulo.id);
    if (actual <= 1) {
      this.carrito.quitar(articulo.id);
    } else {
      this.carrito.cambiarCantidad(articulo.id, actual - 1);
    }
  }

}
