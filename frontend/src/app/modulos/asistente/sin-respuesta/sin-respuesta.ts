import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AsistenteService } from '../../../servicios/asistente';
import { HistorialConsulta } from '../../../modelos/asistente';
import { mensajeError } from '../../../utilidades/errores';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

interface GrupoSinRespuesta {
  texto: string;
  veces: number;
  ultimaFecha: string;
  // Alguna de las veces se encontró respuesta pero el usuario la marcó como "No útil".
  valoradaNoUtil: boolean;
}

// Consultas sin resolver, agrupadas por texto, para decidir qué preguntas entrenar.
@Component({
  selector: 'app-sin-respuesta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, EstadoBadge, Paginador],
  templateUrl: './sin-respuesta.html',
})
export class SinRespuesta implements OnInit {

  private asistente = inject(AsistenteService);

  // Pide abrir el formulario de nueva pregunta con este texto precargado.
  entrenar = output<string>();

  grupos = signal<GrupoSinRespuesta[]>([]);
  paginacion = crearPaginacion(() => this.grupos());
  cargando = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.asistente.listarHistorial({ resuelta: false }).subscribe({
      next: filas => {
        this.grupos.set(this.agrupar(filas));
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudieron cargar las consultas sin respuesta.'));
        this.cargando.set(false);
      }
    });
  }

  private agrupar(filas: HistorialConsulta[]): GrupoSinRespuesta[] {
    const mapa = new Map<string, GrupoSinRespuesta>();
    for (const fila of filas) {
      const clave = fila.texto.trim().toLowerCase();
      const grupo = mapa.get(clave);
      if (!grupo) {
        mapa.set(clave, {
          texto: fila.texto.trim(), veces: 1, ultimaFecha: fila.fecha, valoradaNoUtil: fila.util === false && fila.consulta !== null
        });
        continue;
      }
      grupo.veces++;
      grupo.valoradaNoUtil = grupo.valoradaNoUtil || (fila.util === false && fila.consulta !== null);
      if (fila.fecha > grupo.ultimaFecha) {
        grupo.ultimaFecha = fila.fecha;
      }
    }
    return [...mapa.values()].sort((a, b) => b.veces - a.veces || b.ultimaFecha.localeCompare(a.ultimaFecha));
  }

}
