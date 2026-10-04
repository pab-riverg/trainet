import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { SupervisorContacto, Usuario, UsuariosService } from '../../servicios/usuarios';
import { etiquetaRol } from '../../modelos/roles';
import { marcarInvalidos, mensajeControl } from '../../utilidades/formularios';
import { CampoTelefono } from '../../compartidos/campo-telefono/campo-telefono';
import { CedulaPipe } from '../../compartidos/pipes-numeros';
import { EstadoBadge } from '../../compartidos/estado-badge/estado-badge';
import { formatearFecha } from '../../utilidades/reportes';
import { inicialesDe } from '../../utilidades/perfil';
import { erroresPorCampo } from '../../utilidades/reportes';

type CampoPassword = 'actual' | 'nueva' | 'confirmar';

function passwordsCoinciden(control: AbstractControl): ValidationErrors | null {
  const nueva = control.get('passwordNueva')?.value;
  const confirmar = control.get('passwordConfirmar')?.value;
  return nueva === confirmar ? null : { passwordsNoCoinciden: true };
}

@Component({
  selector: 'app-perfil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CampoTelefono, CedulaPipe, EstadoBadge],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil implements OnInit {

  mensajeControl = mensajeControl;

  private usuariosService = inject(UsuariosService);

  usuario = signal<Usuario | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  // Supervisor aparte del usuario: al guardar el teléfono el API devuelve un usuario sin ese dato.
  supervisor = signal<SupervisorContacto | null>(null);

  etiquetaRolUsuario = computed(() => etiquetaRol(this.usuario()?.rol));
  iniciales = computed(() => inicialesDe(this.usuario()?.nombre));
  formatearFecha = formatearFecha;

  // Contraseñas visibles (true) u ocultas (false), una por campo.
  verPassword = signal<Record<CampoPassword, boolean>>({ actual: false, nueva: false, confirmar: false });

  guardandoTelefono = signal(false);
  errorTelefono = signal<string | null>(null);
  // Error 400 del API para el campo teléfono (se muestra bajo el campo).
  errorTelefonoCampo = signal<string | null>(null);
  exitoTelefono = signal(false);

  telefonoForm = new FormGroup({
    telefono: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  });

  guardandoPassword = signal(false);
  errorPassword = signal<string | null>(null);
  exitoPassword = signal(false);

  passwordForm = new FormGroup({
    passwordActual: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    passwordNueva: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    passwordConfirmar: new FormControl('', { nonNullable: true, validators: [Validators.required] })
  }, { validators: passwordsCoinciden });

  ngOnInit(): void {
    const id = Number(localStorage.getItem('trainet_id'));

    if (!id) {
      this.error.set('No se pudo identificar al usuario en sesión.');
      this.cargando.set(false);
      return;
    }

    this.usuariosService.obtener(id).subscribe({
      next: usuario => {
        this.usuario.set(usuario);
        this.supervisor.set(usuario.supervisor ?? null);
        this.telefonoForm.patchValue({ telefono: usuario.telefono });
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(error?.error?.detail ?? 'No se pudo cargar tu perfil.');
        this.cargando.set(false);
      }
    });
  }

  alternarPassword(campo: CampoPassword): void {
    this.verPassword.update(estado => ({ ...estado, [campo]: !estado[campo] }));
  }

  guardarTelefono(): void {
    if (this.telefonoForm.invalid) {
      marcarInvalidos(this.telefonoForm);
      return;
    }

    const usuario = this.usuario();
    if (!usuario || this.telefonoForm.invalid) {
      return;
    }

    this.guardandoTelefono.set(true);
    this.errorTelefono.set(null);
    this.errorTelefonoCampo.set(null);
    this.exitoTelefono.set(false);

    this.usuariosService.actualizar(usuario.id, { telefono: this.telefonoForm.getRawValue().telefono }).subscribe({
      next: actualizado => {
        this.usuario.set(actualizado);
        this.guardandoTelefono.set(false);
        this.exitoTelefono.set(true);
      },
      error: error => {
        this.guardandoTelefono.set(false);
        const errores = erroresPorCampo(error, ['telefono'], 'No se pudo actualizar tu teléfono.');
        this.errorTelefonoCampo.set(errores.porCampo['telefono'] ?? null);
        this.errorTelefono.set(errores.general);
      }
    });
  }

  cambiarPassword(): void {
    if (this.passwordForm.invalid) {
      marcarInvalidos(this.passwordForm);
      return;
    }

    if (this.passwordForm.invalid) {
      return;
    }

    this.guardandoPassword.set(true);
    this.errorPassword.set(null);
    this.exitoPassword.set(false);

    const { passwordActual, passwordNueva } = this.passwordForm.getRawValue();

    this.usuariosService.cambiarPassword(passwordActual, passwordNueva).subscribe({
      next: () => {
        this.guardandoPassword.set(false);
        this.exitoPassword.set(true);
        this.passwordForm.reset({ passwordActual: '', passwordNueva: '', passwordConfirmar: '' });
      },
      error: error => {
        this.guardandoPassword.set(false);
        this.errorPassword.set(error?.error?.detail ?? 'No se pudo cambiar la contraseña.');
      }
    });
  }

}
