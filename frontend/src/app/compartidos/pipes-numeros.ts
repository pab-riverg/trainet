import { Pipe, PipeTransform } from '@angular/core';
import { formatearCedula, formatearNit, formatearTelefono } from '../utilidades/numeros';

// Pipes puras de presentación. Nulo o vacío -> "—"; si el dato no se puede interpretar (datos antiguos) se muestra tal cual.

@Pipe({ name: 'telefono' })
export class TelefonoPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatearTelefono(valor);
  }
}

@Pipe({ name: 'cedula' })
export class CedulaPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatearCedula(valor);
  }
}

@Pipe({ name: 'nit' })
export class NitPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatearNit(valor);
  }
}
