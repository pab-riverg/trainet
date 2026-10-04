import { Directive, ElementRef, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';
import { soloDigitos } from '../utilidades/numeros';

// Campo que solo acepta dígitos (cédula, NIT): filtra al escribir, pegar, arrastrar y con teclados móviles.
// Úsese en <input type="text">, nunca type="number" (admite "e", flechas y pierde ceros a la izquierda).
@Directive({
  selector: 'input[appSoloDigitos]',
  host: {
    inputmode: 'numeric',
    autocomplete: 'off',
    '(input)': 'filtrar()'
  }
})
export class SoloDigitos {

  private elemento = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private control = inject(NgControl, { optional: true, self: true });

  // Máximo de dígitos (sin límite si no se indica).
  appSoloDigitos = input<number | string>('');

  filtrar(): void {
    const campo = this.elemento.nativeElement;
    const original = campo.value;
    const cursor = campo.selectionStart ?? original.length;
    const maximo = Number(this.appSoloDigitos()) || Infinity;

    const limpio = soloDigitos(original).slice(0, maximo);
    if (limpio === original) {
      return;
    }
    // El cursor queda tras la misma cantidad de dígitos que tenía a su izquierda.
    const antesDelCursor = Math.min(soloDigitos(original.slice(0, cursor)).length, limpio.length);
    campo.value = limpio;
    campo.setSelectionRange(antesDelCursor, antesDelCursor);
    // El valor del formulario debe ser el filtrado, no el texto original que alcanzó a leer el accessor.
    this.control?.control?.setValue(limpio);
  }

}
