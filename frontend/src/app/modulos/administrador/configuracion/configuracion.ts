import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdministracionService } from '../../../servicios/administracion';
import { MAX_NOMBRE_EQUIPO } from '../../../utilidades/administracion';
import { erroresPorCampo } from '../../../utilidades/reportes';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { mensajeError } from '../../../utilidades/errores';

@Component({
  selector: 'app-configuracion-sistema',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './configuracion.html',
})
export class ConfiguracionSistema implements OnInit {

  private administracion = inject(AdministracionService);

  readonly maximo = MAX_NOMBRE_EQUIPO;
  mensajeControl = mensajeControl;

  // Nombre guardado actualmente (el mismo que ve la barra superior).
  nombreGuardado = this.administracion.nombreEquipo;

  configuracionForm = new FormGroup({
    nombre_equipo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(MAX_NOMBRE_EQUIPO)] })
  });
  private valorEscrito = toSignal(this.configuracionForm.controls.nombre_equipo.valueChanges, { initialValue: '' });

  cargando = signal(false);
  errorCarga = signal<string | null>(null);
  guardando = signal(false);
  errorApi = signal<string | null>(null);
  errorGeneral = signal<string | null>(null);
  exito = signal<string | null>(null);
  aviso = signal<string | null>(null);

  longitud = computed(() => this.valorEscrito().length);
  // Vista previa con el mismo recorte de espacios que hace el API.
  vistaPrevia = computed(() => this.valorEscrito().split(/\s+/).filter(Boolean).join(' '));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.administracion.obtenerConfiguracion().subscribe({
      next: configuracion => {
        this.configuracionForm.reset({ nombre_equipo: configuracion.nombre_equipo });
        this.cargando.set(false);
      },
      error: error => {
        this.errorCarga.set(mensajeError(error, 'No se pudo cargar la configuración.'));
        this.cargando.set(false);
      }
    });
  }

  guardar(): void {
    this.exito.set(null);
    this.aviso.set(null);
    this.errorApi.set(null);
    this.errorGeneral.set(null);

    if (this.configuracionForm.invalid) {
      marcarInvalidos(this.configuracionForm);
      return;
    }

    const nombre = this.vistaPrevia();
    if (!nombre) {
      this.configuracionForm.controls.nombre_equipo.setErrors({ required: true });
      marcarInvalidos(this.configuracionForm);
      return;
    }
    if (nombre === this.nombreGuardado()) {
      this.aviso.set('No hay cambios que guardar.');
      return;
    }

    this.guardando.set(true);
    this.administracion.actualizarConfiguracion({ nombre_equipo: nombre }).subscribe({
      next: configuracion => {
        // La barra superior ya cambió: el servicio actualiza su signal al recibir la respuesta.
        this.configuracionForm.reset({ nombre_equipo: configuracion.nombre_equipo });
        this.guardando.set(false);
        this.exito.set('Nombre del equipo actualizado. Ya se ve en la barra superior.');
      },
      error: error => {
        this.guardando.set(false);
        // Se conserva lo escrito y el error se muestra bajo el campo.
        const errores = erroresPorCampo(error, ['nombre_equipo'], 'No se pudo guardar la configuración.');
        this.errorApi.set(errores.porCampo['nombre_equipo'] ?? null);
        this.errorGeneral.set(errores.general);
      }
    });
  }

}
