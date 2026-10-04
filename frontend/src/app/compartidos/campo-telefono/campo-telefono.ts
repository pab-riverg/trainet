import { ChangeDetectionStrategy, Component, forwardRef, input, signal } from '@angular/core';
import { AbstractControl, ControlValueAccessor, NG_VALIDATORS, NG_VALUE_ACCESSOR, ValidationErrors, Validator } from '@angular/forms';
import {
  NUMERO_TELEFONO_MAX, PREFIJO_POR_DEFECTO, PREFIJO_TELEFONO_MAX, componerTelefono, esTelefonoCanonico,
  parsearTelefono, soloDigitos
} from '../../utilidades/numeros';

// Campo de teléfono: "+" fijo, caja de prefijo (1–3 dígitos) y caja de número (7–12 dígitos). Solo acepta dígitos.
// El valor del control es la cadena canónica "+57 3001234567", o "" si el número está vacío.
// Funciona con formControlName y formControl. Un valor vacío es válido (el campo es obligatorio solo si el control
// lleva Validators.required); un valor parcial o fuera de rango es inválido.
@Component({
  selector: 'app-campo-telefono',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => CampoTelefono), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => CampoTelefono), multi: true }
  ],
  template: `
    <div class="input-group campo-telefono">
      <span class="input-group-text" aria-hidden="true">+</span>
      <input type="text"
             class="form-control campo-telefono-prefijo"
             inputmode="numeric"
             autocomplete="off"
             [attr.maxlength]="maxPrefijo"
             [value]="prefijo()"
             [disabled]="deshabilitado()"
             [class.is-invalid]="invalido()"
             aria-label="Prefijo del país"
             (input)="alEscribirPrefijo($event)"
             (blur)="alTocar()" />
      <input type="text"
             class="form-control campo-telefono-numero"
             inputmode="numeric"
             autocomplete="off"
             [id]="idCampo()"
             [attr.maxlength]="maxNumero"
             [value]="numero()"
             [disabled]="deshabilitado()"
             [class.is-invalid]="invalido()"
             placeholder="3001234567"
             aria-label="Número de teléfono"
             (input)="alEscribirNumero($event)"
             (blur)="alTocar()" />
    </div>
  `,
  styles: `
    .campo-telefono {
      flex-wrap: nowrap;
      max-width: 340px;
    }

    .campo-telefono-prefijo {
      flex: 0 0 4.5rem;
      min-width: 0;
      text-align: center;
    }

    .campo-telefono-numero {
      min-width: 0;
    }
  `,
})
export class CampoTelefono implements ControlValueAccessor, Validator {

  // Id del campo del número, para enlazarlo con su <label for>.
  idCampo = input<string>('');
  // El anfitrión indica si debe verse en rojo (inválido y tocado).
  invalido = input(false);

  readonly maxPrefijo = PREFIJO_TELEFONO_MAX;
  readonly maxNumero = NUMERO_TELEFONO_MAX;

  prefijo = signal(PREFIJO_POR_DEFECTO);
  numero = signal('');
  deshabilitado = signal(false);

  private alCambiar: (valor: string) => void = () => undefined;
  private alTocarInterno: () => void = () => undefined;

  writeValue(valor: string | null): void {
    const partes = parsearTelefono(valor);
    this.prefijo.set(partes.prefijo);
    this.numero.set(partes.numero);

    // Un dato antiguo (por ejemplo "3001234567") se interpreta y el formulario recibe la versión canónica.
    const entrante = (valor ?? '').trim();
    const canonico = this.valorActual();
    if (entrante && entrante !== canonico) {
      Promise.resolve().then(() => this.alCambiar(canonico));
    }
  }

  registerOnChange(fn: (valor: string) => void): void {
    this.alCambiar = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.alTocarInterno = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado.set(deshabilitado);
  }

  validate(control: AbstractControl): ValidationErrors | null {
    const valor = control.value as string | null;
    return !valor || esTelefonoCanonico(valor) ? null : { telefono: true };
  }

  alTocar(): void {
    this.alTocarInterno();
  }

  alEscribirPrefijo(evento: Event): void {
    const limpio = soloDigitos((evento.target as HTMLInputElement).value).slice(0, PREFIJO_TELEFONO_MAX);
    (evento.target as HTMLInputElement).value = limpio;
    this.prefijo.set(limpio);
    this.alCambiar(this.valorActual());
  }

  alEscribirNumero(evento: Event): void {
    const limpio = soloDigitos((evento.target as HTMLInputElement).value).slice(0, NUMERO_TELEFONO_MAX);
    (evento.target as HTMLInputElement).value = limpio;
    this.numero.set(limpio);
    this.alCambiar(this.valorActual());
  }

  // Sin número el teléfono se considera vacío; con número se compone aunque esté incompleto (la validación lo señala).
  private valorActual(): string {
    return this.numero() ? componerTelefono(this.prefijo(), this.numero()) : '';
  }

}
