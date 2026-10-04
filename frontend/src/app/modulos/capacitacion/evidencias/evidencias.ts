import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, switchMap, tap } from 'rxjs';
import { CapacitacionService } from '../../../servicios/capacitacion';
import { Capacitacion, EvidenciaParticipacion, ParticipanteCapacitacion } from '../../../modelos/capacitacion';
import { ROLES_GESTION_EVIDENCIAS } from '../../../modelos/permisos-capacitacion';
import { cerrarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

const LIMITE_TAMANO_ARCHIVO = 10 * 1024 * 1024;

@Component({
  selector: 'app-evidencias',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion, Paginador],
  templateUrl: './evidencias.html',
  styleUrl: './evidencias.css',
})
export class Evidencias implements OnInit {

  private capacitacionService = inject(CapacitacionService);

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  capacitaciones = signal<Capacitacion[]>([]);
  errorCapacitaciones = signal<string | null>(null);
  capacitacionSeleccionada = new FormControl<number | null>(null);

  participantes = signal<ParticipanteCapacitacion[]>([]);
  cargandoParticipantes = signal(false);
  errorParticipantes = signal<string | null>(null);
  participanteSeleccionado = new FormControl<number | null>(null);

  evidencias = signal<EvidenciaParticipacion[]>([]);
  paginacion = crearPaginacion(() => this.evidencias());
  cargandoEvidencias = signal(false);
  errorEvidencias = signal<string | null>(null);

  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  subiendo = signal(false);
  errorSubida = signal<string | null>(null);

  evidenciaAEliminar = signal<EvidenciaParticipacion | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  private rolActual = signal(localStorage.getItem('trainet_rol'));
  puedeGestionar = computed(() => ROLES_GESTION_EVIDENCIAS.includes(this.rolActual() ?? ''));

  constructor() {
    // Cambiar un filtro o la selección vuelve a la primera página.
    this.capacitacionSeleccionada.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
    this.participanteSeleccionado.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
    this.capacitacionSeleccionada.valueChanges
      .pipe(
        tap(() => this.participanteSeleccionado.setValue(null)),
        switchMap(id => {
          if (id === null) {
            this.participantes.set([]);
            this.errorParticipantes.set(null);
            this.cargandoParticipantes.set(false);
            return EMPTY;
          }
          this.cargandoParticipantes.set(true);
          this.errorParticipantes.set(null);
          return this.capacitacionService.listarParticipantes({ fo_capacitacion: id });
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: participantes => {
          this.participantes.set(participantes);
          this.cargandoParticipantes.set(false);
        },
        error: error => {
          this.errorParticipantes.set(mensajeError(error, 'No se pudo cargar la lista de participantes.'));
          this.cargandoParticipantes.set(false);
        }
      });

    this.participanteSeleccionado.valueChanges
      .pipe(
        tap(() => this.limpiarFormularioSubida()),
        switchMap(id => {
          if (id === null) {
            this.evidencias.set([]);
            this.errorEvidencias.set(null);
            this.cargandoEvidencias.set(false);
            return EMPTY;
          }
          this.cargandoEvidencias.set(true);
          this.errorEvidencias.set(null);
          return this.capacitacionService.listarEvidencias(id);
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: evidencias => {
          this.evidencias.set(evidencias);
          this.cargandoEvidencias.set(false);
        },
        error: error => {
          this.errorEvidencias.set(mensajeError(error, 'No se pudo cargar la lista de evidencias.'));
          this.cargandoEvidencias.set(false);
        }
      });
  }

  ngOnInit(): void {
    this.cargarCapacitaciones();
  }

  cargarCapacitaciones(): void {
    this.capacitacionService.listarCapacitaciones().subscribe({
      next: lista => this.capacitaciones.set(lista),
      error: error => this.errorCapacitaciones.set(mensajeError(error, 'No se pudo cargar la lista de capacitaciones.'))
    });
  }

  nombreArchivo(url: string): string {
    const partes = url.split('/');
    return partes[partes.length - 1] || url;
  }

  private recargarEvidenciasActual(): void {
    const id = this.participanteSeleccionado.value;
    this.participanteSeleccionado.setValue(id);
  }

  private limpiarFormularioSubida(): void {
    this.errorSubida.set(null);
    this.limpiarArchivo();
  }

  private limpiarArchivo(): void {
    this.archivoSeleccionado.set(null);
    this.errorArchivo.set(null);
    const input = this.archivoInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.errorArchivo.set(null);

    if (archivo && archivo.size > LIMITE_TAMANO_ARCHIVO) {
      this.errorArchivo.set('El archivo supera el límite de 10 MB.');
      this.limpiarArchivo();
      return;
    }

    this.archivoSeleccionado.set(archivo);
  }

  subir(): void {
    const idParticipante = this.participanteSeleccionado.value;
    const archivo = this.archivoSeleccionado();
    if (idParticipante === null || !archivo) {
      return;
    }

    this.subiendo.set(true);
    this.errorSubida.set(null);

    this.capacitacionService.subirEvidencia(archivo, idParticipante).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.limpiarArchivo();
        this.recargarEvidenciasActual();
      },
      error: error => {
        this.subiendo.set(false);
        this.errorSubida.set(mensajeError(error, 'No se pudo subir la evidencia.'));
      }
    });
  }

  abrirEliminar(evidencia: EvidenciaParticipacion): void {
    this.evidenciaAEliminar.set(evidencia);
    this.errorEliminar.set(null);
  }

  confirmarEliminar(): void {
    const evidencia = this.evidenciaAEliminar();
    if (!evidencia) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.capacitacionService.eliminarEvidencia(evidencia.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        cerrarModal('modalEliminarEvidencia');
        this.recargarEvidenciasActual();
      },
      error: error => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeError(error, 'No se pudo eliminar la evidencia.'));
      }
    });
  }

}
