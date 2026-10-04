import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComprasService } from '../../../../servicios/compras';
import { SolicitudCompra } from '../../../../modelos/compras';
import { ROLES_GESTION_COMPRAS } from '../../../../modelos/permisos-compras';
import { mensajeError } from '../../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../../utilidades/formularios';

const MAX_CARACTERES = 500;

// Observaciones del encargado sobre una solicitud pendiente: las deja administración y las leen
// quienes deciden (administrador y directivo) antes de aprobar o rechazar. No cambian el estado.
@Component({
  selector: 'app-seccion-observaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './seccion-observaciones.html',
})
export class SeccionObservaciones {

  mensajeControl = mensajeControl;

  private comprasService = inject(ComprasService);

  solicitud = input.required<SolicitudCompra>();
  actualizada = output<SolicitudCompra>();

  maxCaracteres = MAX_CARACTERES;

  // El formulario de grupo evita que el <form> se envíe de forma nativa (necesita [formGroup]).
  observacionControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(MAX_CARACTERES)] });
  observacionForm = new FormGroup({ observacion: this.observacionControl });

  enCurso = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);

  puedeObservar = ROLES_GESTION_COMPRAS.includes(localStorage.getItem('trainet_rol') ?? '');

  // Las observaciones salen de la bitácora (el detalle la trae; la copia de la lista aún no).
  observaciones = computed(() => (this.solicitud().historial ?? []).filter(evento => evento.tipo === 'observacion'));

  private idSolicitud = computed(() => this.solicitud().id);

  constructor() {
    effect(() => {
      this.idSolicitud();
      untracked(() => {
        this.observacionControl.reset('');
        this.error.set(null);
        this.exito.set(null);
      });
    });
  }

  longitud(): number {
    return this.observacionControl.value.length;
  }

  agregar(): void {
    if (this.observacionForm.invalid) {
      marcarInvalidos(this.observacionForm);
      return;
    }

    const texto = this.observacionControl.value.trim();
    if (!texto) {
      this.error.set('Escribe la observación antes de agregarla.');
      this.exito.set(null);
      return;
    }
    if (texto.length > MAX_CARACTERES) {
      this.error.set(`La observación no puede superar los ${MAX_CARACTERES} caracteres.`);
      this.exito.set(null);
      return;
    }

    this.enCurso.set(true);
    this.error.set(null);
    this.exito.set(null);

    this.comprasService.observarSolicitud(this.solicitud().id, { observacion: texto }).subscribe({
      next: solicitud => {
        this.enCurso.set(false);
        this.observacionControl.reset('');
        this.exito.set('Observación agregada. Se avisó a quienes deciden.');
        this.actualizada.emit(solicitud);
      },
      error: error => {
        this.enCurso.set(false);
        this.error.set(mensajeError(error, 'No se pudo agregar la observación.'));
      }
    });
  }

}
