import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

/**
 * Captura del sistema dentro de un marco tipo ventana de navegador. Si la imagen no existe o falla, muestra un
 * marcador de posición (icono y nombre del módulo) en lugar de una imagen rota.
 * Emite `cargaCambio` con true cuando la imagen carga y con false cuando falla.
 */
@Component({
  selector: 'app-figura-producto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
  template: `
    <figure class="fp-ventana">
      <div class="fp-barra" aria-hidden="true">
        <span class="fp-punto"></span><span class="fp-punto"></span><span class="fp-punto"></span>
      </div>
      <div class="fp-lienzo">
        @if (marcador()) {
          <div class="fp-marcador" role="img" [attr.aria-label]="alt()">
            <i class="bi fp-marcador-icono" [class]="icono()" aria-hidden="true"></i>
            <span class="fp-marcador-nombre">{{ nombre() }}</span>
          </div>
        } @else {
          <img [ngSrc]="ruta()" [alt]="alt()" width="1600" height="900" class="fp-imagen"
               (load)="cargaCambio.emit(true)" (error)="alFallar()" />
        }
      </div>
    </figure>
  `,
  styleUrl: './figura-producto.css'
})
export class FiguraProducto {

  /** Ruta de la imagen (por ejemplo '/img/home/dashboard.webp'). */
  readonly ruta = input.required<string>();
  readonly alt = input.required<string>();
  /** Nombre del módulo para el marcador de posición. */
  readonly nombre = input('');
  /** Clase de Bootstrap Icons del marcador de posición. */
  readonly icono = input('bi-image');

  readonly cargaCambio = output<boolean>();

  // Se guarda la ruta que falló (no un booleano): al cambiar de ruta el marcador se quita solo.
  private rutaFallida = signal<string | null>(null);
  protected marcador = computed(() => this.rutaFallida() === this.ruta());

  protected alFallar(): void {
    this.rutaFallida.set(this.ruta());
    this.cargaCambio.emit(false);
  }

}
