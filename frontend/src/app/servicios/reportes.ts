import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ArchivoEdicion,
  ArchivoEntrada,
  ArchivoImportado,
  ConsolidarEntrada,
  FiltrosArchivos,
  FiltrosInformes,
  FormatoExportacion,
  GenerarInformeEntrada,
  InformeDetalle,
  InformeLista,
  OrigenTipo,
  RespuestaCarpetas,
  TipoReporte,
  VistaPreviaArchivo,
} from '../modelos/reportes';

/**
 * Acceso a la API del módulo Reportes y Análisis (prefijo /api/).
 * Solo contiene llamadas HTTP: la lógica de pantalla vive en los componentes.
 * Las descargas son blobs para que el interceptor adjunte el token de autenticación.
 */
@Injectable({
  providedIn: 'root'
})
export class ReportesService {

  private http = inject(HttpClient);

  private url(recurso: string): string {
    return `${environment.apiUrl}/${recurso}/`;
  }

  // --- Tipos de reporte ---

  // origen 'archivo': categorías de los archivos importados. 'sistema': tipos de informe de gestión
  // (sin el consolidado). Sin origen devuelve todos.
  listarTipos(origen?: OrigenTipo): Observable<TipoReporte[]> {
    const params = origen ? new HttpParams().set('origen', origen) : new HttpParams();
    return this.http.get<TipoReporte[]>(this.url('tipos-reporte'), { params });
  }

  // --- Archivos importados ---

  // Por defecto el API devuelve solo los archivos activos.
  listarArchivos(filtros?: FiltrosArchivos): Observable<ArchivoImportado[]> {
    let params = new HttpParams();
    if (filtros?.tipo) {
      params = params.set('tipo', filtros.tipo);
    }
    if (filtros?.anio) {
      params = params.set('anio', filtros.anio);
    }
    if (filtros?.mes) {
      params = params.set('mes', filtros.mes);
    }
    if (filtros?.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros?.hasta) {
      params = params.set('hasta', filtros.hasta);
    }
    if (filtros?.activo !== undefined) {
      params = params.set('activo', filtros.activo);
    }
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    return this.http.get<ArchivoImportado[]>(this.url('archivos-importados'), { params });
  }

  // Multipart: el API valida formato (.csv/.xlsx), tamaño (10 MB), contenido y duplicados.
  importarArchivo(datos: ArchivoEntrada): Observable<ArchivoImportado> {
    const formData = new FormData();
    formData.append('titulo', datos.titulo);
    formData.append('descripcion', datos.descripcion);
    formData.append('fo_tipo', String(datos.fo_tipo));
    formData.append('fecha_documento', datos.fecha_documento);
    formData.append('archivo', datos.archivo);
    return this.http.post<ArchivoImportado>(this.url('archivos-importados'), formData);
  }

  // El archivo en sí no se puede cambiar: solo sus datos descriptivos.
  editarArchivo(id: number, datos: ArchivoEdicion): Observable<ArchivoImportado> {
    return this.http.patch<ArchivoImportado>(`${this.url('archivos-importados')}${id}/`, datos);
  }

  // Responde 400 si el archivo está activo o si está incluido en algún informe.
  eliminarArchivo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url('archivos-importados')}${id}/`);
  }

  archivarArchivo(id: number): Observable<ArchivoImportado> {
    return this.http.post<ArchivoImportado>(`${this.url('archivos-importados')}${id}/archivar/`, {});
  }

  restaurarArchivo(id: number): Observable<ArchivoImportado> {
    return this.http.post<ArchivoImportado>(`${this.url('archivos-importados')}${id}/restaurar/`, {});
  }

  descargarArchivo(id: number): Observable<Blob> {
    return this.http.get(`${this.url('archivos-importados')}${id}/descargar/`, { responseType: 'blob' });
  }

  // Encabezados y las primeras 20 filas.
  vistaPrevia(id: number): Observable<VistaPreviaArchivo> {
    return this.http.get<VistaPreviaArchivo>(`${this.url('archivos-importados')}${id}/vista-previa/`);
  }

  // Carpetas virtuales: archivos activos agrupados por año, mes y tipo.
  listarCarpetas(filtros?: { tipo?: number; anio?: number }): Observable<RespuestaCarpetas> {
    let params = new HttpParams();
    if (filtros?.tipo) {
      params = params.set('tipo', filtros.tipo);
    }
    if (filtros?.anio) {
      params = params.set('anio', filtros.anio);
    }
    return this.http.get<RespuestaCarpetas>(`${this.url('archivos-importados')}carpetas/`, { params });
  }

  // --- Informes ---

  // Lista liviana (sin contenido), más recientes primero.
  listarInformes(filtros?: FiltrosInformes): Observable<InformeLista[]> {
    let params = new HttpParams();
    if (filtros?.tipo) {
      params = params.set('tipo', filtros.tipo);
    }
    if (filtros?.desde) {
      params = params.set('desde', filtros.desde);
    }
    if (filtros?.hasta) {
      params = params.set('hasta', filtros.hasta);
    }
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    return this.http.get<InformeLista[]>(this.url('informes'), { params });
  }

  // Informe completo, con su contenido ya como objeto.
  obtenerInforme(id: number): Observable<InformeDetalle> {
    return this.http.get<InformeDetalle>(`${this.url('informes')}${id}/`);
  }

  // Informe de gestión de un tipo de sistema en un rango (máximo 366 días; sin fechas = últimos 30 días).
  generarInforme(datos: GenerarInformeEntrada): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(`${this.url('informes')}generar/`, datos);
  }

  // Consolida de 2 a 20 archivos activos en un solo informe.
  consolidarArchivos(datos: ConsolidarEntrada): Observable<InformeDetalle> {
    return this.http.post<InformeDetalle>(`${this.url('informes')}consolidar/`, datos);
  }

  // Devuelve la respuesta completa para poder leer el nombre del archivo en Content-Disposition.
  exportarInforme(id: number, formato: FormatoExportacion): Observable<HttpResponse<Blob>> {
    const params = new HttpParams().set('formato', formato);
    return this.http.get(`${this.url('informes')}${id}/exportar/`, { params, responseType: 'blob', observe: 'response' });
  }

  eliminarInforme(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url('informes')}${id}/`);
  }
}
