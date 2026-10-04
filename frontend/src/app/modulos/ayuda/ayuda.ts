import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { startWith } from 'rxjs';
import { ConsultaFrecuente } from '../../modelos/asistente';
import { AsistenteService } from '../../servicios/asistente';
import { InicioService } from '../../servicios/inicio';
import { CORREO_CONTACTO_AYUDA, filtrarPreguntas, guiaDeModulos } from '../../utilidades/ayuda';
import { mensajeError } from '../../utilidades/errores';

@Component({
  selector: 'app-ayuda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './ayuda.html',
  styleUrl: './ayuda.css',
})
export class Ayuda implements OnInit {

  private asistente = inject(AsistenteService);
  private inicio = inject(InicioService);

  readonly correoContacto = CORREO_CONTACTO_AYUDA;

  busqueda = new FormControl('', { nonNullable: true });
  private texto = toSignal(this.busqueda.valueChanges.pipe(startWith('')), { initialValue: '' });

  preguntas = signal<ConsultaFrecuente[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  preguntasVisibles = computed(() => filtrarPreguntas(this.preguntas(), this.texto()));

  // Guía generada con los módulos que el backend declara para el rol del usuario.
  modulos = computed(() => guiaDeModulos(this.inicio.modulos()));
  tieneSoporte = computed(() => this.inicio.modulos().some(modulo => modulo.clave === 'soporte'));

  ngOnInit(): void {
    this.inicio.cargar();
    // Mismo endpoint que alimenta a Triny: cualquier usuario autenticado lee las preguntas activas.
    this.asistente.listarConsultas({ activa: true }).subscribe({
      next: preguntas => {
        this.preguntas.set(preguntas);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudieron cargar las preguntas frecuentes.'));
        this.cargando.set(false);
      }
    });
  }

}
