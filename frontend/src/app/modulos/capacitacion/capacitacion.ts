import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CapacitacionService } from '../../servicios/capacitacion';
import { mensajeError } from '../../utilidades/errores';
import { sincronizarPestanaConVista } from '../../utilidades/rutas';
import { Cursos } from './cursos/cursos';
import { Capacitaciones } from './capacitaciones/capacitaciones';
import { Inscripciones } from './inscripciones/inscripciones';
import { Materiales } from './materiales/materiales';
import { Evidencias } from './evidencias/evidencias';
import { Historial } from './historial/historial';

interface Pestana {
  id: string;
  etiqueta: string;
}

@Component({
  selector: 'app-capacitacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Cursos, Capacitaciones, Inscripciones, Materiales, Evidencias, Historial],
  templateUrl: './capacitacion.html',
  styleUrl: './capacitacion.css',
})
export class Capacitacion implements OnInit {

  private capacitacionService = inject(CapacitacionService);

  cargando = signal(true);
  error = signal<string | null>(null);
  moduloId = signal<number | null>(null);

  pestanas: Pestana[] = [
    { id: 'cursos', etiqueta: 'Cursos' },
    { id: 'capacitaciones', etiqueta: 'Capacitaciones' },
    { id: 'inscripciones', etiqueta: 'Inscripción y asistencia' },
    { id: 'materiales', etiqueta: 'Materiales' },
    { id: 'evidencias', etiqueta: 'Evidencias' },
    { id: 'historial', etiqueta: 'Historial' }
  ];

  pestanaActiva = signal<string>('cursos');

  // La URL (?vista=) y la pestaña activa se mantienen sincronizadas; `actualizarVista` refleja el cambio manual.
  private actualizarVista = sincronizarPestanaConVista(() => this.pestanas.map(p => p.id), id => this.pestanaActiva.set(id));

  ngOnInit(): void {
    this.capacitacionService.listarModuloCapacitacion().subscribe({
      next: modulos => {
        const primero = modulos[0];
        if (!primero) {
          this.error.set('El módulo de capacitación no está configurado.');
          this.cargando.set(false);
          return;
        }
        this.moduloId.set(primero.id);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'El módulo de capacitación no está configurado.'));
        this.cargando.set(false);
      }
    });
  }

  cambiarPestana(id: string): void {
    this.pestanaActiva.set(id);
    this.actualizarVista(id);
  }

}
