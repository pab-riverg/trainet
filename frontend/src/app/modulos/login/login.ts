import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, inject, signal, viewChild
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../servicios/auth';
import { CORREO_CONTACTO_AYUDA } from '../../utilidades/ayuda';
import { marcarInvalidos, mensajeControl } from '../../utilidades/formularios';

// Clave propia del tema del login (no es la del modo oscuro global).
export const CLAVE_TEMA_LOGIN = 'trainet_login_tema';
export type TemaLogin = 'noche' | 'claro';

export const MENSAJE_CREDENCIALES = 'Correo o contraseña incorrectos';
export const MENSAJE_SERVIDOR = 'No pudimos conectar con el servidor. Inténtalo de nuevo en unos minutos.';

function leerTema(): TemaLogin {
  try {
    return localStorage.getItem(CLAVE_TEMA_LOGIN) === 'claro' ? 'claro' : 'noche';
  } catch {
    return 'noche';
  }
}

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  private router = inject(Router);
  private auth = inject(Auth);
  private injector = inject(Injector);

  mensajeControl = mensajeControl;
  readonly correoContacto = CORREO_CONTACTO_AYUDA;

  form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  enviando = signal(false);
  errorMsg = signal<string | null>(null);
  verPassword = signal(false);

  // Tema solo del fondo de la mitad derecha; se aplica desde el primer render (sin parpadeo).
  tema = signal<TemaLogin>(leerTema());

  ayudaAbierta = signal(false);
  private origenAyuda: HTMLElement | null = null;

  private campoEmail = viewChild<ElementRef<HTMLInputElement>>('campoEmail');
  private botonCerrarAyuda = viewChild<ElementRef<HTMLButtonElement>>('botonCerrarAyuda');
  private dialogoAyuda = viewChild<ElementRef<HTMLElement>>('dialogoAyuda');

  login(): void {
    if (this.enviando()) {
      return;
    }
    if (this.form.invalid) {
      marcarInvalidos(this.form);
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.enviando.set(true);
    this.errorMsg.set(null);

    this.auth.login(email, password).subscribe({
      next: () => {
        this.enviando.set(false);
        void this.router.navigate(['/inicio']);
      },
      error: (error: unknown) => {
        this.enviando.set(false);
        // El API responde 400/401 con credenciales inválidas; sin respuesta (0), 429 o 5xx es un problema de conexión.
        const estado = error instanceof HttpErrorResponse ? error.status : 0;
        this.errorMsg.set(estado === 400 || estado === 401 ? MENSAJE_CREDENCIALES : MENSAJE_SERVIDOR);
      }
    });
  }

  alternarPassword(): void {
    this.verPassword.update(valor => !valor);
  }

  enfocarCorreo(): void {
    this.campoEmail()?.nativeElement.focus();
  }

  alternarTema(): void {
    const nuevo: TemaLogin = this.tema() === 'noche' ? 'claro' : 'noche';
    this.tema.set(nuevo);
    try {
      localStorage.setItem(CLAVE_TEMA_LOGIN, nuevo);
    } catch {
      // Sin almacenamiento disponible: el tema solo dura mientras la página siga abierta.
    }
  }

  // --- Diálogo de ayuda ---

  abrirAyuda(origen: HTMLElement): void {
    this.origenAyuda = origen;
    this.ayudaAbierta.set(true);
    afterNextRender(() => this.botonCerrarAyuda()?.nativeElement.focus(), { injector: this.injector });
  }

  cerrarAyuda(): void {
    this.ayudaAbierta.set(false);
    this.origenAyuda?.focus();
    this.origenAyuda = null;
  }

  alClicEnFondo(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) {
      this.cerrarAyuda();
    }
  }

  // Escape cierra; Tab queda dentro del diálogo.
  alTeclearEnAyuda(evento: KeyboardEvent): void {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      this.cerrarAyuda();
      return;
    }
    if (evento.key !== 'Tab') {
      return;
    }
    const enfocables = Array.from(
      this.dialogoAyuda()?.nativeElement.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []
    );
    if (enfocables.length === 0) {
      return;
    }
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (evento.shiftKey && document.activeElement === primero) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault();
      primero.focus();
    }
  }

}
