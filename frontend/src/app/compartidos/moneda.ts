import { Directive, ElementRef, forwardRef, inject, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DINERO_MAX_DIGITOS, digitosADinero, formatearMiles, soloDigitos } from '../utilidades/numeros';

// Campo de dinero en pesos enteros. Muestra el punto de miles mientras se escribe ("1.234.567"), pero el valor
// del control es un NÚMERO entero (null si está vacío), nunca el texto con puntos. Conserva la posición del cursor.
@Directive({
  selector: 'input[appMoneda]',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Moneda), multi: true }],
  host: {
    inputmode: 'numeric',
    autocomplete: 'off',
    '(input)': 'alEscribir()',
    '(keydown)': 'alPresionar($event)',
    '(blur)': 'alSalir()'
  }
})
export class Moneda implements ControlValueAccessor {

  private elemento = inject<ElementRef<HTMLInputElement>>(ElementRef);

  // Máximo de dígitos (12 por defecto).
  appMoneda = input<number | string>('');

  private alCambiar: (valor: number | null) => void = () => undefined;
  private alTocar: () => void = () => undefined;

  private get maximo(): number {
    return Number(this.appMoneda()) || DINERO_MAX_DIGITOS;
  }

  writeValue(valor: number | null): void {
    const entero = valor === null || valor === undefined || isNaN(Number(valor)) ? null : Math.trunc(Number(valor));
    this.elemento.nativeElement.value = entero === null ? '' : formatearMiles(String(entero));
  }

  registerOnChange(fn: (valor: number | null) => void): void {
    this.alCambiar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocar = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.elemento.nativeElement.disabled = deshabilitado;
  }

  alEscribir(): void {
    const campo = this.elemento.nativeElement;
    const texto = campo.value;
    const cursor = campo.selectionStart ?? texto.length;

    const crudos = soloDigitos(texto);
    const sinCeros = crudos.replace(/^0+(?=\d)/, '').slice(0, this.maximo);
    const ceroQuitados = crudos.length - crudos.replace(/^0+(?=\d)/, '').length;

    // Dígitos que había a la izquierda del cursor (descontando ceros iniciales eliminados).
    const antesDelCursor = Math.min(Math.max(0, soloDigitos(texto.slice(0, cursor)).length - ceroQuitados), sinCeros.length);

    const formateado = formatearMiles(sinCeros);
    campo.value = formateado;
    campo.setSelectionRange(this.posicionTrasDigitos(formateado, antesDelCursor), this.posicionTrasDigitos(formateado, antesDelCursor));

    this.alCambiar(digitosADinero(sinCeros));
  }

  // Al borrar o suprimir junto a un punto, el cursor lo salta para que la tecla elimine un dígito real.
  alPresionar(evento: KeyboardEvent): void {
    const campo = this.elemento.nativeElement;
    const inicio = campo.selectionStart ?? 0;
    if (inicio !== campo.selectionEnd) {
      return;
    }
    if (evento.key === 'Backspace' && campo.value[inicio - 1] === '.') {
      campo.setSelectionRange(inicio - 1, inicio - 1);
    } else if (evento.key === 'Delete' && campo.value[inicio] === '.') {
      campo.setSelectionRange(inicio + 1, inicio + 1);
    }
  }

  alSalir(): void {
    this.alTocar();
  }

  // Índice del texto formateado justo después del n-ésimo dígito.
  private posicionTrasDigitos(texto: string, cantidad: number): number {
    if (cantidad <= 0) {
      return 0;
    }
    let vistos = 0;
    for (let i = 0; i < texto.length; i++) {
      if (texto[i] !== '.' && ++vistos === cantidad) {
        return i + 1;
      }
    }
    return texto.length;
  }

}
