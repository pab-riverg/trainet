import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, switchMap, tap } from 'rxjs';
import { CapacitacionService } from '../../../servicios/capacitacion';
import { Capacitacion, Empleado, ParticipanteCapacitacion } from '../../../modelos/capacitacion';
import { ROLES_GESTION_PARTICIPANTES } from '../../../modelos/permisos-capacitacion';
import { cerrarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

@Component({
  selector: 'app-inscripciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion, Paginador],
  templateUrl: './inscripciones.html',
  styleUrl: './inscripciones.css',
})
export class Inscripciones implements OnInit {

  private capacitacionService = inject(CapacitacionService);

  capacitaciones = signal<Capacitacion[]>([]);
  cargandoCapacitaciones = signal(false);
  errorCapacitaciones = signal<string | null>(null);
  capacitacionSeleccionada = new FormControl<number | null>(null);

  participantes = signal<ParticipanteCapacitacion[]>([]);
  paginacion = crearPaginacion(() => this.participantes());
  cargandoParticipantes = signal(false);
  errorParticipantes = signal<string | null>(null);

  empleados = signal<Empleado[]>([]);
  errorEmpleados = signal<string | null>(null);
  empleadoSeleccionado = new FormControl<number | null>(null);

  empleadosDisponibles = computed(() => {
    const inscritos = new Set(this.participantes().map(participante => participante.fo_empleado));
    return this.empleados().filter(empleado => !inscritos.has(empleado.id));
  });

  inscribiendo = signal(false);
  errorInscripcion = signal<string | null>(null);

  idsActualizandoAsistencia = signal<number[]>([]);
  errorAsistencia = signal<string | null>(null);

  participanteAEliminar = signal<ParticipanteCapacitacion | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  private rolActual = signal(localStorage.getItem('trainet_rol'));
  puedeGestionar = computed(() => ROLES_GESTION_PARTICIPANTES.includes(this.rolActual() ?? ''));

  constructor() {
    // Cambiar un filtro o la selección vuelve a la primera página.
    this.capacitacionSeleccionada.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
    this.capacitacionSeleccionada.valueChanges
      .pipe(
        tap(() => {
          this.empleadoSeleccionado.setValue(null);
          this.errorInscripcion.set(null);
        }),
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
  }

  ngOnInit(): void {
    this.cargarCapacitaciones();
    this.cargarEmpleados();
  }

  cargarCapacitaciones(): void {
    this.cargandoCapacitaciones.set(true);
    this.errorCapacitaciones.set(null);

    this.capacitacionService.listarCapacitaciones().subscribe({
      next: lista => {
        this.capacitaciones.set(lista);
        this.cargandoCapacitaciones.set(false);
      },
      error: error => {
        this.errorCapacitaciones.set(mensajeError(error, 'No se pudo cargar la lista de capacitaciones.'));
        this.cargandoCapacitaciones.set(false);
      }
    });
  }

  cargarEmpleados(): void {
    this.capacitacionService.listarEmpleados().subscribe({
      next: empleados => this.empleados.set(empleados),
      error: error => this.errorEmpleados.set(mensajeError(error, 'No se pudieron cargar los empleados.'))
    });
  }

  private recargarParticipantesActual(): void {
    const id = this.capacitacionSeleccionada.value;
    this.capacitacionSeleccionada.setValue(id);
  }

  alternarAsistencia(participante: ParticipanteCapacitacion, nuevoValor: boolean): void {
    const valorAnterior = participante.asistio;
    this.errorAsistencia.set(null);
    this.idsActualizandoAsistencia.update(ids => [...ids, participante.id]);
    this.participantes.update(lista =>
      lista.map(p => (p.id === participante.id ? { ...p, asistio: nuevoValor } : p))
    );

    this.capacitacionService.marcarAsistencia(participante.id, nuevoValor).subscribe({
      next: actualizado => {
        this.participantes.update(lista =>
          lista.map(p => (p.id === actualizado.id ? actualizado : p))
        );
        this.idsActualizandoAsistencia.update(ids => ids.filter(id => id !== participante.id));
      },
      error: error => {
        this.participantes.update(lista =>
          lista.map(p => (p.id === participante.id ? { ...p, asistio: valorAnterior } : p))
        );
        this.idsActualizandoAsistencia.update(ids => ids.filter(id => id !== participante.id));
        this.errorAsistencia.set(mensajeError(error, 'No se pudo actualizar la asistencia.'));
      }
    });
  }

  inscribir(): void {
    const idCapacitacion = this.capacitacionSeleccionada.value;
    const idEmpleado = this.empleadoSeleccionado.value;
    if (idCapacitacion === null || idEmpleado === null) {
      return;
    }

    this.inscribiendo.set(true);
    this.errorInscripcion.set(null);

    this.capacitacionService.inscribirParticipante(idCapacitacion, idEmpleado).subscribe({
      next: () => {
        this.inscribiendo.set(false);
        this.empleadoSeleccionado.setValue(null);
        this.recargarParticipantesActual();
      },
      error: error => {
        this.inscribiendo.set(false);
        this.errorInscripcion.set(mensajeError(error, 'No se pudo inscribir al empleado.'));
      }
    });
  }

  abrirEliminar(participante: ParticipanteCapacitacion): void {
    this.participanteAEliminar.set(participante);
    this.errorEliminar.set(null);
  }

  confirmarEliminar(): void {
    const participante = this.participanteAEliminar();
    if (!participante) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.capacitacionService.eliminarParticipante(participante.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        cerrarModal('modalEliminarParticipante');
        this.recargarParticipantesActual();
      },
      error: error => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeError(error, 'No se pudo quitar al participante.'));
      }
    });
  }

}
