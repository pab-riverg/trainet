import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RespuestaBusqueda } from '../modelos/busqueda';

/**
 * Acceso a la API del buscador global (GET /api/buscar/).
 * Solo contiene la llamada HTTP: el backend decide en qué módulos busca según el rol del usuario autenticado
 * (el interceptor adjunta el token) y devuelve los resultados ya agrupados por módulo.
 */
@Injectable({
  providedIn: 'root'
})
export class BusquedaService {

  private http = inject(HttpClient);

  // Texto de 2 a 60 caracteres. HttpParams codifica el texto; no se concatena a mano en la URL.
  buscar(texto: string): Observable<RespuestaBusqueda> {
    const params = new HttpParams().set('q', texto);
    return this.http.get<RespuestaBusqueda>(`${environment.apiUrl}/buscar/`, { params });
  }

}
