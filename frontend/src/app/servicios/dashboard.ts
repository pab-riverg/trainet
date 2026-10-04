import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ContenidoDashboard, FiltrosDashboard } from '../modelos/dashboard';

/** Acceso a GET /api/dashboard/ (solo administrador y directivo). Es una lectura: no genera informes. */
@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  private http = inject(HttpClient);

  /** Indicadores gerenciales del periodo; sin fechas, los últimos 30 días. */
  obtener(filtros?: FiltrosDashboard): Observable<ContenidoDashboard> {
    let params = new HttpParams();
    if (filtros?.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros?.hasta) {
      params = params.set('hasta', filtros.hasta);
    }
    return this.http.get<ContenidoDashboard>(`${environment.apiUrl}/dashboard/`, { params });
  }
}
