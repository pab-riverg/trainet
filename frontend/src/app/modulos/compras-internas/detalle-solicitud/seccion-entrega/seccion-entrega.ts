import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ComprasService } from '../../../../servicios/compras';
import { SolicitudCompra } from '../../../../modelos/compras';
import { ROLES_GESTION_COMPRAS, ROLES_SOLICITUD_COMPRAS } from '../../../../modelos/permisos-compras';
import { mensajeError } from '../../../../utilidades/errores';

// Entrega, confirmación de recepción del solicitante, reclamo y revisión.
@Component({
  selector: 'app-seccion-entrega',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './seccion-entrega.html',
  styles: `
    .caja-recepcion {
      border: 2px solid var(--app-acento);
      border-radius: 12px;
      background: var(--app-acento-suave);
      padding: 1rem;
    }
  `,
})
export class SeccionEntrega {

  private comprasService = inject(ComprasService);

  solicitud = input.required<SolicitudCompra>();
  actualizada = output<SolicitudCompra>();

  notaControl = new FormControl('', { nonNullable: true });
  motivoControl = new FormControl('', { nonNullable: true });

  confirmandoEntrega = signal(false);
  confirmandoRecepcion = signal(false);
  reclamando = signal(false);
  enCurso = signal(false);
  error = signal<string | null>(null);

  private rol = localStorage.getItem('trainet_rol') ?? '';
  private idActual = Number(localStorage.getItem('trainet_id'));

  puedeEntregar = computed(() => ROLES_GESTION_COMPRAS.includes(this.rol));

  esSolicitante = computed(
    () => ROLES_SOLICITUD_COMPRAS.includes(this.rol) && this.solicitud().fo_solicitante === this.idActual
  );

  private idYEstado = computed(() => `${this.solicitud().id}:${this.solicitud().estado}`);

  constructor() {
    // Al cambiar de solicitud o de estado se limpian los formularios y las confirmaciones en línea.
    effect(() => {
      this.idYEstado();
      untracked(() => {
        this.notaControl.reset('');
        this.motivoControl.reset('');
        this.confirmandoEntrega.set(false);
        this.confirmandoRecepcion.set(false);
        this.reclamando.set(false);
        this.error.set(null);
      });
    });
  }

  private ejecutar(peticion: ReturnType<ComprasService['entregarSolicitud']>, mensajeFallo: string): void {
    this.enCurso.set(true);
    this.error.set(null);

    peticion.subscribe({
      next: solicitud => {
        this.enCurso.set(false);
        this.actualizada.emit(solicitud);
      },
      error: error => {
        this.enCurso.set(false);
        this.confirmandoEntrega.set(false);
        this.confirmandoRecepcion.set(false);
        this.error.set(mensajeError(error, mensajeFallo));
      }
    });
  }

  // comprada → entregada (la nota es opcional).
  entregar(): void {
    const nota = this.notaControl.value.trim();
    this.ejecutar(
      this.comprasService.entregarSolicitud(this.solicitud().id, { nota: nota || undefined }),
      'No se pudo marcar la solicitud como entregada.'
    );
  }

  // en_revision → entregada: la nota con la resolución es obligatoria (se valida antes de llamar al backend).
  entregarNuevamente(): void {
    const nota = this.notaControl.value.trim();
    if (!nota) {
      this.error.set('Escribe la nota con la resolución acordada antes de entregar nuevamente.');
      return;
    }
    this.ejecutar(
      this.comprasService.entregarSolicitud(this.solicitud().id, { nota }),
      'No se pudo marcar la solicitud como entregada nuevamente.'
    );
  }

  confirmarRecepcion(): void {
    this.ejecutar(this.comprasService.confirmarRecepcion(this.solicitud().id), 'No se pudo confirmar la recepción.');
  }

  reportarNoRecibida(): void {
    const motivo = this.motivoControl.value.trim();
    this.ejecutar(
      this.comprasService.reportarNoRecibida(this.solicitud().id, { motivo: motivo || undefined }),
      'No se pudo enviar el reclamo.'
    );
  }

}
