import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notificacion } from '../modelos/notificaciones';

@Injectable({
  providedIn: 'root'
})
export class NotificacionesService {

  private http = inject(HttpClient);

  listar(filtros?: { leida?: boolean }): Observable<Notificacion[]> {
    let params = new HttpParams();
    if (filtros?.leida !== undefined) {
      params = params.set('leida', filtros.leida);
    }
    return this.http.get<Notificacion[]>(`${environment.apiUrl}/notificaciones/`, { params });
  }

  contarNoLeidas(): Observable<{ total: number }> {
    return this.http.get<{ total: number }>(`${environment.apiUrl}/notificaciones/no-leidas/`);
  }

  marcarLeida(id: number): Observable<Notificacion> {
    return this.http.post<Notificacion>(`${environment.apiUrl}/notificaciones/${id}/marcar_leida/`, {});
  }

  marcarTodasLeidas(): Observable<{ actualizadas: number }> {
    return this.http.post<{ actualizadas: number }>(`${environment.apiUrl}/notificaciones/marcar-todas-leidas/`, {});
  }

}
