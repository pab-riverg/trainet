import { Injectable, computed, signal } from '@angular/core';
import { Articulo, LineaCarrito } from '../modelos/compras';

const CANTIDAD_MINIMA = 1;
const CANTIDAD_MAXIMA = 99;

// Carrito de la tienda interna. Al ser un servicio singleton, el contenido sobrevive a la
// navegación entre módulos; recargar la página lo vacía (vive solo en memoria).
@Injectable({
  providedIn: 'root'
})
export class CarritoService {

  private lineasInterno = signal<LineaCarrito[]>([]);

  lineas = this.lineasInterno.asReadonly();

  unidades = computed(() => this.lineasInterno().reduce((suma, linea) => suma + linea.cantidad, 0));

  numeroLineas = computed(() => this.lineasInterno().length);

  totalEstimado = computed(
    () => this.lineasInterno().reduce((suma, linea) => suma + linea.cantidad * linea.articulo.precio_referencia, 0)
  );

  cantidadDe(idArticulo: number): number {
    return this.lineasInterno().find(linea => linea.articulo.id === idArticulo)?.cantidad ?? 0;
  }

  // Si el artículo ya está en el carrito, suma una unidad.
  agregar(articulo: Articulo): void {
    const existente = this.lineasInterno().find(linea => linea.articulo.id === articulo.id);
    if (existente) {
      this.cambiarCantidad(articulo.id, existente.cantidad + 1);
      return;
    }
    this.lineasInterno.update(lineas => [...lineas, { articulo, cantidad: CANTIDAD_MINIMA, justificacion: '' }]);
  }

  cambiarCantidad(idArticulo: number, cantidad: number): void {
    const acotada = Math.min(CANTIDAD_MAXIMA, Math.max(CANTIDAD_MINIMA, Math.trunc(cantidad) || CANTIDAD_MINIMA));
    this.lineasInterno.update(lineas =>
      lineas.map(linea => (linea.articulo.id === idArticulo ? { ...linea, cantidad: acotada } : linea))
    );
  }

  quitar(idArticulo: number): void {
    this.lineasInterno.update(lineas => lineas.filter(linea => linea.articulo.id !== idArticulo));
  }

  cambiarJustificacion(idArticulo: number, texto: string): void {
    this.lineasInterno.update(lineas =>
      lineas.map(linea => (linea.articulo.id === idArticulo ? { ...linea, justificacion: texto } : linea))
    );
  }

  vaciar(): void {
    this.lineasInterno.set([]);
  }

}
