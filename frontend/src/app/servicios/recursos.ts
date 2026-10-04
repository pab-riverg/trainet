import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ModuloPedidoRecursos, SolicitudRecursos, TipoRecurso } from '../modelos/recursos';

export interface FiltrosSolicitudes {
  search?: string;
  estado?: string;
  prioridad?: string;
  fo_tipo_recurso?: number;
}

export interface SolicitudCrear {
  cantidad: number;
  justificacion: string;
  prioridad: string;
  fo_tipo_recurso: number;
  fo_mod_pedido: number;
}

export interface SolicitudDecision {
  estado: 'aprobado' | 'rechazado';
  comentario_encargado: string;
  presupuesto_estimado?: number;
}

@Injectable({
  providedIn: 'root'
})
export class RecursosService {

  private http = inject(HttpClient);

  listarModuloPedidos(): Observable<ModuloPedidoRecursos[]> {
    return this.http.get<ModuloPedidoRecursos[]>(`${environment.apiUrl}/modulo-pedido-recursos/`);
  }

  listarTipos(): Observable<TipoRecurso[]> {
    return this.http.get<TipoRecurso[]>(`${environment.apiUrl}/tipos-recurso/`);
  }

  crearTipo(datos: { nombre_tipo: string; disponible: boolean }): Observable<TipoRecurso> {
    return this.http.post<TipoRecurso>(`${environment.apiUrl}/tipos-recurso/`, datos);
  }

  actualizarTipo(id: number, datos: Partial<{ nombre_tipo: string; disponible: boolean }>): Observable<TipoRecurso> {
    return this.http.patch<TipoRecurso>(`${environment.apiUrl}/tipos-recurso/${id}/`, datos);
  }

  eliminarTipo(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/tipos-recurso/${id}/`);
  }

  listarSolicitudes(filtros?: FiltrosSolicitudes): Observable<SolicitudRecursos[]> {
    let params = new HttpParams();
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros?.prioridad) {
      params = params.set('prioridad', filtros.prioridad);
    }
    if (filtros?.fo_tipo_recurso) {
      params = params.set('fo_tipo_recurso', filtros.fo_tipo_recurso);
    }
    return this.http.get<SolicitudRecursos[]>(`${environment.apiUrl}/solicitudes-recursos/`, { params });
  }

  crearSolicitud(datos: SolicitudCrear): Observable<SolicitudRecursos> {
    return this.http.post<SolicitudRecursos>(`${environment.apiUrl}/solicitudes-recursos/`, datos);
  }

  cancelarSolicitud(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/solicitudes-recursos/${id}/`);
  }

  confirmarDisponibilidad(id: number): Observable<SolicitudRecursos> {
    return this.http.post<SolicitudRecursos>(`${environment.apiUrl}/solicitudes-recursos/${id}/confirmar-disponibilidad/`, {});
  }

  decidirSolicitud(id: number, datos: SolicitudDecision): Observable<SolicitudRecursos> {
    return this.http.post<SolicitudRecursos>(`${environment.apiUrl}/solicitudes-recursos/${id}/decidir/`, datos);
  }

  entregarSolicitud(id: number, archivo: File): Observable<SolicitudRecursos> {
    const formData = new FormData();
    formData.set('archivo', archivo);
    return this.http.post<SolicitudRecursos>(`${environment.apiUrl}/solicitudes-recursos/${id}/entregar/`, formData);
  }

}
