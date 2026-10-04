import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UsuariosService } from '../../servicios/usuarios';
import { marcarInvalidos, mensajeControl } from '../../utilidades/formularios';

@Component({
  selector: 'app-recuperar-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar-password.html',
  styleUrl: './recuperar-password.css'
})
export class RecuperarPassword {

  mensajeControl = mensajeControl;

  private usuariosService = inject(UsuariosService);

  enviando = signal(false);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] })
  });

  enviar(): void {
    if (this.form.invalid) {
      marcarInvalidos(this.form);
      return;
    }

    if (this.form.invalid) {
      return;
    }

    this.enviando.set(true);
    this.mensaje.set(null);
    this.error.set(null);

    this.usuariosService.solicitarRecuperacion(this.form.getRawValue().email).subscribe({
      next: respuesta => {
        this.enviando.set(false);
        this.mensaje.set(respuesta.detail);
      },
      error: () => {
        this.enviando.set(false);
        this.error.set('No se pudo procesar tu solicitud. Intenta nuevamente más tarde.');
      }
    });
  }

}
