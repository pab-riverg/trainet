import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output } from '@angular/core';
import { TAMANO_PAGINA_DEFECTO, rangoMostrado, totalPaginas, ventanaPaginas } from '../../utilidades/paginacion';
import { formatearNumero } from '../../utilidades/reportes';

/**
 * Paginador presentacional: « Anterior 1 2 3 … N Siguiente » más "Mostrando 11–20 de 47". Solo se muestra con más
 * de una página. No decide nada: emite `cambioPagina` y el padre pagina en cliente (ver crearPaginacion en
 * utilidades/paginacion.ts) o pide la página al servidor. Colócalo dentro de la tarjeta, justo bajo la tabla:
 * al cambiar de página hace scroll suave hasta el encabezado de la tabla si este quedó fuera de pantalla.
 */
@Component({
  selector: 'app-paginador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './paginador.html',
  styleUrl: './paginador.css',
})
export class Paginador {

  private elemento = inject(ElementRef<HTMLElement>);

  // Cantidad total de elementos (no de páginas).
  total = input.required<number>();
  // Página actual, desde 1.
  pagina = input.required<number>();
  tamano = input(TAMANO_PAGINA_DEFECTO);

  cambioPagina = output<number>();

  paginas = computed(() => totalPaginas(this.total(), this.tamano()));
  visible = computed(() => this.paginas() > 1);
  elementos = computed(() => ventanaPaginas(this.pagina(), this.paginas()));
  rango = computed(() => rangoMostrado(this.pagina(), this.total(), this.tamano()));

  formatearNumero = formatearNumero;

  ir(destino: number): void {
    if (destino < 1 || destino > this.paginas() || destino === this.pagina()) {
      return;
    }
    this.cambioPagina.emit(destino);
    this.mostrarEncabezado();
  }

  // Si el encabezado de la tabla quedó por encima de la zona visible, sube hasta él; si ya se ve, no mueve nada.
  private mostrarEncabezado(): void {
    const tarjeta = (this.elemento.nativeElement as HTMLElement).closest('.users-table-card');
    const encabezado = tarjeta?.querySelector('thead') ?? tarjeta;
    if (!encabezado) {
      return;
    }
    const topbar = document.querySelector('#topbar')?.getBoundingClientRect().bottom ?? 0;
    if (encabezado.getBoundingClientRect().top < topbar) {
      encabezado.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

}
