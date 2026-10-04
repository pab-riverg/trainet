import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CategoriaTicket,
  EvidenciaTicket,
  ModuloSoporteTecnico,
  TecnicoSoporte,
  TicketSoporte,
} from '../modelos/soporte';

export interface FiltrosTickets {
  search?: string;
  estado?: string;
  prioridad?: string;
  fo_categoria_ticket?: number;
  fecha_creacion?: string;
}

export interface TicketCrear {
  descripcion: string;
  prioridad: string;
  fo_categoria_ticket: number;
  fo_mod_soporte: number;
}

export type TicketActualizar = Partial<{
  estado: string;
  observaciones: string;
  fo_tecnico: number | null;
}>;

@Injectable({
  providedIn: 'root'
})
export class SoporteService {

  private http = inject(HttpClient);

  listarModuloSoporte(): Observable<ModuloSoporteTecnico[]> {
    return this.http.get<ModuloSoporteTecnico[]>(`${environment.apiUrl}/modulo-soporte-tecnico/`);
  }

  listarCategorias(): Observable<CategoriaTicket[]> {
    return this.http.get<CategoriaTicket[]>(`${environment.apiUrl}/categorias-ticket/`);
  }

  listarTecnicos(): Observable<TecnicoSoporte[]> {
    return this.http.get<TecnicoSoporte[]>(`${environment.apiUrl}/tecnicos-soporte/`);
  }

  listarTickets(filtros?: FiltrosTickets): Observable<TicketSoporte[]> {
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
    if (filtros?.fo_categoria_ticket) {
      params = params.set('fo_categoria_ticket', filtros.fo_categoria_ticket);
    }
    if (filtros?.fecha_creacion) {
      params = params.set('fecha_creacion', filtros.fecha_creacion);
    }
    return this.http.get<TicketSoporte[]>(`${environment.apiUrl}/tickets-soporte/`, { params });
  }

  obtenerTicket(id: number): Observable<TicketSoporte> {
    return this.http.get<TicketSoporte>(`${environment.apiUrl}/tickets-soporte/${id}/`);
  }

  crearTicket(datos: TicketCrear): Observable<TicketSoporte> {
    return this.http.post<TicketSoporte>(`${environment.apiUrl}/tickets-soporte/`, datos);
  }

  actualizarTicket(id: number, datos: TicketActualizar): Observable<TicketSoporte> {
    return this.http.patch<TicketSoporte>(`${environment.apiUrl}/tickets-soporte/${id}/`, datos);
  }

  eliminarTicket(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/tickets-soporte/${id}/`);
  }

  listarEvidencias(fo_ticket: number): Observable<EvidenciaTicket[]> {
    const params = new HttpParams().set('fo_ticket', fo_ticket);
    return this.http.get<EvidenciaTicket[]>(`${environment.apiUrl}/evidencias-ticket/`, { params });
  }

  subirEvidencia(archivo: File, fo_ticket: number): Observable<EvidenciaTicket> {
    const formData = new FormData();
    formData.set('archivo', archivo);
    formData.set('fo_ticket', String(fo_ticket));
    return this.http.post<EvidenciaTicket>(`${environment.apiUrl}/evidencias-ticket/`, formData);
  }

  eliminarEvidencia(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/evidencias-ticket/${id}/`);
  }

}
