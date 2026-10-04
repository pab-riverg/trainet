import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Capacitacion,
  CapacitacionCrear,
  Capacitador,
  CategoriaCurso,
  Curso,
  CursoCrear,
  Empleado,
  EvidenciaParticipacion,
  MaterialEducativo,
  ModuloCapacitacion,
  ParticipanteCapacitacion,
  ProgresoCurso,
} from '../modelos/capacitacion';

@Injectable({
  providedIn: 'root'
})
export class CapacitacionService {

  private http = inject(HttpClient);

  listarModuloCapacitacion(): Observable<ModuloCapacitacion[]> {
    return this.http.get<ModuloCapacitacion[]>(`${environment.apiUrl}/modulo-capacitacion/`);
  }

  listarCategorias(): Observable<CategoriaCurso[]> {
    return this.http.get<CategoriaCurso[]>(`${environment.apiUrl}/categorias-curso/`);
  }

  crearCategoria(nombre_categoria: string): Observable<CategoriaCurso> {
    return this.http.post<CategoriaCurso>(`${environment.apiUrl}/categorias-curso/`, { nombre_categoria });
  }

  listarCursos(): Observable<Curso[]> {
    return this.http.get<Curso[]>(`${environment.apiUrl}/cursos/`);
  }

  crearCurso(datos: CursoCrear): Observable<Curso> {
    return this.http.post<Curso>(`${environment.apiUrl}/cursos/`, datos);
  }

  actualizarCurso(id: number, datos: Partial<CursoCrear>): Observable<Curso> {
    return this.http.patch<Curso>(`${environment.apiUrl}/cursos/${id}/`, datos);
  }

  eliminarCurso(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/cursos/${id}/`);
  }

  listarCapacitadores(): Observable<Capacitador[]> {
    return this.http.get<Capacitador[]>(`${environment.apiUrl}/capacitadores/`);
  }

  listarEmpleados(): Observable<Empleado[]> {
    return this.http.get<Empleado[]>(`${environment.apiUrl}/empleados/`);
  }

  listarCapacitaciones(): Observable<Capacitacion[]> {
    return this.http.get<Capacitacion[]>(`${environment.apiUrl}/capacitaciones/`);
  }

  crearCapacitacion(datos: CapacitacionCrear): Observable<Capacitacion> {
    return this.http.post<Capacitacion>(`${environment.apiUrl}/capacitaciones/`, datos);
  }

  actualizarCapacitacion(id: number, datos: Partial<CapacitacionCrear>): Observable<Capacitacion> {
    return this.http.patch<Capacitacion>(`${environment.apiUrl}/capacitaciones/${id}/`, datos);
  }

  eliminarCapacitacion(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/capacitaciones/${id}/`);
  }

  listarMateriales(fo_curso?: number): Observable<MaterialEducativo[]> {
    let params = new HttpParams();
    if (fo_curso) {
      params = params.set('fo_curso', fo_curso);
    }
    return this.http.get<MaterialEducativo[]>(`${environment.apiUrl}/materiales-educativos/`, { params });
  }

  subirMaterial(titulo: string, archivo: File, fo_curso: number): Observable<MaterialEducativo> {
    const formData = new FormData();
    formData.set('titulo', titulo);
    formData.set('archivo', archivo);
    formData.set('fo_curso', String(fo_curso));
    return this.http.post<MaterialEducativo>(`${environment.apiUrl}/materiales-educativos/`, formData);
  }

  eliminarMaterial(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/materiales-educativos/${id}/`);
  }

  listarParticipantes(filtros?: { fo_capacitacion?: number; fo_empleado?: number }): Observable<ParticipanteCapacitacion[]> {
    let params = new HttpParams();
    if (filtros?.fo_capacitacion) {
      params = params.set('fo_capacitacion', filtros.fo_capacitacion);
    }
    if (filtros?.fo_empleado) {
      params = params.set('fo_empleado', filtros.fo_empleado);
    }
    return this.http.get<ParticipanteCapacitacion[]>(`${environment.apiUrl}/participantes-capacitacion/`, { params });
  }

  inscribirParticipante(fo_capacitacion: number, fo_empleado: number): Observable<ParticipanteCapacitacion> {
    return this.http.post<ParticipanteCapacitacion>(`${environment.apiUrl}/participantes-capacitacion/`, {
      fo_capacitacion,
      fo_empleado,
      asistio: false
    });
  }

  marcarAsistencia(id: number, asistio: boolean): Observable<ParticipanteCapacitacion> {
    return this.http.patch<ParticipanteCapacitacion>(`${environment.apiUrl}/participantes-capacitacion/${id}/`, { asistio });
  }

  eliminarParticipante(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/participantes-capacitacion/${id}/`);
  }

  listarEvidencias(fo_participante?: number): Observable<EvidenciaParticipacion[]> {
    let params = new HttpParams();
    if (fo_participante) {
      params = params.set('fo_participante', fo_participante);
    }
    return this.http.get<EvidenciaParticipacion[]>(`${environment.apiUrl}/evidencias-participacion/`, { params });
  }

  subirEvidencia(archivo: File, fo_participante: number): Observable<EvidenciaParticipacion> {
    const formData = new FormData();
    formData.set('archivo', archivo);
    formData.set('fo_participante', String(fo_participante));
    return this.http.post<EvidenciaParticipacion>(`${environment.apiUrl}/evidencias-participacion/`, formData);
  }

  eliminarEvidencia(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/evidencias-participacion/${id}/`);
  }

  listarProgreso(fo_empleado?: number): Observable<ProgresoCurso[]> {
    let params = new HttpParams();
    if (fo_empleado) {
      params = params.set('fo_empleado', fo_empleado);
    }
    return this.http.get<ProgresoCurso[]>(`${environment.apiUrl}/progreso-cursos/`, { params });
  }

}
