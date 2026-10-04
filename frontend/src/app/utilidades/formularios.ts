import { AbstractControl, FormGroup, Validators } from '@angular/forms';

// Marca todos los campos como tocados para que se muestren sus mensajes de error.
export function marcarInvalidos(form: FormGroup): void {
  form.markAllAsTouched();
}

// True si el control es obligatorio (también cuando el validador se agrega dinámicamente).
export function esObligatorio(control: AbstractControl): boolean {
  return control.hasValidator(Validators.required);
}

// Mensaje de error de un control inválido y tocado; cadena vacía si no hay error que mostrar.
export function mensajeControl(control: AbstractControl): string {
  if (!control.touched || !control.errors) {
    return '';
  }

  const errores = control.errors;
  if (errores['required']) {
    return 'Este campo es obligatorio';
  }
  if (errores['email']) {
    return 'Ingresa un correo electrónico válido';
  }
  if (errores['maxlength']) {
    return `Máximo ${errores['maxlength'].requiredLength} caracteres`;
  }
  if (errores['minlength']) {
    return `Mínimo ${errores['minlength'].requiredLength} caracteres`;
  }
  if (errores['min']) {
    return `El valor mínimo es ${errores['min'].min}`;
  }
  if (errores['max']) {
    return `El valor máximo es ${errores['max'].max}`;
  }
  if (errores['telefono']) {
    return 'Escribe el prefijo (1 a 3 dígitos) y el número (7 a 12 dígitos).';
  }
  if (errores['pattern']) {
    return 'El formato no es válido';
  }
  return 'El valor no es válido';
}
