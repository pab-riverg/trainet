import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CategoriaAsistente,
  CategoriaAsistenteEntrada,
  ConsultaFrecuente,
  ConsultaFrecuenteEntrada,
  FiltrosConsultas,
  FiltrosHistorial,
  HistorialConsulta,
  ResultadoConsulta,
} from '../modelos/asistente';

/**
 * Acceso a la API del asistente virtual "Triny" (prefijo /api/).
 * Solo contiene llamadas HTTP: la lógica de pantalla vive en los componentes.
 * El interceptor de autenticación agrega el token a cada petición.
 */
@Injectable({
  providedIn: 'root'
})
export class AsistenteService {

  private http = inject(HttpClient);

  private url(recurso: string): string {
    return `${environment.apiUrl}/${recurso}/`;
  }

  // --- Conversación ---

  // El backend busca la mejor coincidencia entre las preguntas entrenadas y registra la consulta en el historial.
  preguntar(texto: string): Observable<ResultadoConsulta> {
    return this.http.post<ResultadoConsulta>(this.url('asistente/preguntar'), { texto });
  }

  // Respuesta a una pregunta elegida del menú o de una sugerencia. 404 si no existe o está inactiva.
  seleccionar(consulta: number): Observable<ResultadoConsulta> {
    return this.http.post<ResultadoConsulta>(this.url('asistente/seleccionar'), { consulta });
  }

  // --- Categorías (escritura solo para el administrador) ---

  listarCategorias(): Observable<CategoriaAsistente[]> {
    return this.http.get<CategoriaAsistente[]>(this.url('categorias-asistente'));
  }

  crearCategoria(datos: CategoriaAsistenteEntrada): Observable<CategoriaAsistente> {
    return this.http.post<CategoriaAsistente>(this.url('categorias-asistente'), datos);
  }

  editarCategoria(id: number, datos: Partial<CategoriaAsistenteEntrada>): Observable<CategoriaAsistente> {
    return this.http.patch<CategoriaAsistente>(`${this.url('categorias-asistente')}${id}/`, datos);
  }

  // Responde 400 si la categoría tiene preguntas: se mueven o se desactivan antes.
  eliminarCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url('categorias-asistente')}${id}/`);
  }

  // --- Preguntas frecuentes (escritura solo para el administrador) ---

  listarConsultas(filtros?: FiltrosConsultas): Observable<ConsultaFrecuente[]> {
    let params = new HttpParams();
    if (filtros?.categoria) {
      params = params.set('categoria', filtros.categoria);
    }
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    if (filtros?.activa !== undefined) {
      params = params.set('activa', filtros.activa);
    }
    return this.http.get<ConsultaFrecuente[]>(this.url('consultas-frecuentes'), { params });
  }

  crearConsulta(datos: ConsultaFrecuenteEntrada): Observable<ConsultaFrecuente> {
    return this.http.post<ConsultaFrecuente>(this.url('consultas-frecuentes'), this.cuerpoConsulta(datos));
  }

  editarConsulta(id: number, datos: Partial<ConsultaFrecuenteEntrada>): Observable<ConsultaFrecuente> {
    return this.http.patch<ConsultaFrecuente>(`${this.url('consultas-frecuentes')}${id}/`, this.cuerpoConsulta(datos));
  }

  eliminarConsulta(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url('consultas-frecuentes')}${id}/`);
  }

  // Se descarga como blob para que el interceptor adjunte el token de autenticación.
  descargarArchivo(id: number): Observable<Blob> {
    return this.http.get(`${this.url('consultas-frecuentes')}${id}/descargar/`, { responseType: 'blob' });
  }

  // --- Historial ---

  // Cada usuario recibe solo el suyo; el administrador recibe todos y puede filtrar.
  listarHistorial(filtros?: FiltrosHistorial): Observable<HistorialConsulta[]> {
    let params = new HttpParams();
    if (filtros?.resuelta !== undefined) {
      params = params.set('resuelta', filtros.resuelta);
    }
    if (filtros?.util !== undefined) {
      params = params.set('util', filtros.util);
    }
    if (filtros?.usuario) {
      params = params.set('usuario', filtros.usuario);
    }
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    return this.http.get<HistorialConsulta[]>(this.url('historial-consultas'), { params });
  }

  // Solo el dueño de la consulta puede valorarla. util=false la marca también como sin resolver.
  valorar(id: number, util: boolean): Observable<HistorialConsulta> {
    return this.http.post<HistorialConsulta>(`${this.url('historial-consultas')}${id}/valorar/`, { util });
  }

  // Con archivo la petición es multipart (FormData); sin archivo se envía JSON.
  private cuerpoConsulta(datos: Partial<ConsultaFrecuenteEntrada>): object | FormData {
    const { archivo, ...resto } = datos;
    if (!archivo) {
      return resto;
    }
    const formData = new FormData();
    if (resto.pregunta !== undefined) {
      formData.append('pregunta', resto.pregunta);
    }
    if (resto.respuesta !== undefined) {
      formData.append('respuesta', resto.respuesta);
    }
    if (resto.fo_categoria !== undefined) {
      formData.append('fo_categoria', resto.fo_categoria === null ? '' : String(resto.fo_categoria));
    }
    if (resto.palabras_clave !== undefined) {
      formData.append('palabras_clave', resto.palabras_clave);
    }
    if (resto.activa !== undefined) {
      formData.append('activa', String(resto.activa));
    }
    formData.append('archivo', archivo);
    return formData;
  }
}
