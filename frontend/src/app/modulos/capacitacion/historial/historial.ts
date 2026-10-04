import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, switchMap } from 'rxjs';
import { CapacitacionService } from '../../../servicios/capacitacion';
import { Empleado, ParticipanteCapacitacion, ProgresoCurso } from '../../../modelos/capacitacion';
import { mensajeError } from '../../../utilidades/errores';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

@Component({
  selector: 'app-historial',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, EstadoBadge, Paginador],
  templateUrl: './historial.html',
  styleUrl: './historial.css',
})
export class Historial implements OnInit {

  private capacitacionService = inject(CapacitacionService);

  empleados = signal<Empleado[]>([]);
  errorEmpleados = signal<string | null>(null);
  empleadoSeleccionado = new FormControl<number | null>(null);

  participaciones = signal<ParticipanteCapacitacion[]>([]);
  paginacion = crearPaginacion(() => this.participaciones());
  cargandoParticipaciones = signal(false);
  errorParticipaciones = signal<string | null>(null);

  progreso = signal<ProgresoCurso[]>([]);
  cargandoProgreso = signal(false);
  errorProgreso = signal<string | null>(null);

  resumen = computed(() => {
    const total = this.participaciones().length;
    const asistidas = this.participaciones().filter(participacion => participacion.asistio).length;
    return { asistidas, total };
  });

  constructor() {
    // Cambiar un filtro o la selección vuelve a la primera página.
    this.empleadoSeleccionado.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
    this.empleadoSeleccionado.valueChanges
      .pipe(
        switchMap(id => {
          if (id === null) {
            this.participaciones.set([]);
            this.errorParticipaciones.set(null);
            this.cargandoParticipaciones.set(false);
            return EMPTY;
          }
          this.cargandoParticipaciones.set(true);
          this.errorParticipaciones.set(null);
          return this.capacitacionService.listarParticipantes({ fo_empleado: id });
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: lista => {
          this.participaciones.set(lista);
          this.cargandoParticipaciones.set(false);
        },
        error: error => {
          this.errorParticipaciones.set(mensajeError(error, 'No se pudo cargar el historial de participaciones.'));
          this.cargandoParticipaciones.set(false);
        }
      });

    this.empleadoSeleccionado.valueChanges
      .pipe(
        switchMap(id => {
          if (id === null) {
            this.progreso.set([]);
            this.errorProgreso.set(null);
            this.cargandoProgreso.set(false);
            return EMPTY;
          }
          this.cargandoProgreso.set(true);
          this.errorProgreso.set(null);
          return this.capacitacionService.listarProgreso(id);
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: lista => {
          this.progreso.set(lista);
          this.cargandoProgreso.set(false);
        },
        error: error => {
          this.errorProgreso.set(mensajeError(error, 'No se pudo cargar el progreso por curso.'));
          this.cargandoProgreso.set(false);
        }
      });
  }

  ngOnInit(): void {
    this.cargarEmpleados();
  }

  cargarEmpleados(): void {
    this.capacitacionService.listarEmpleados().subscribe({
      next: empleados => this.empleados.set(empleados),
      error: error => this.errorEmpleados.set(mensajeError(error, 'No se pudieron cargar los empleados.'))
    });
  }

}
