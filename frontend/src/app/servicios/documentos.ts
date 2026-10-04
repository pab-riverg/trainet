import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CategoriaDocumento,
  Documento,
  DocumentoInstitucional,
  HistorialAccesoDocumento,
  ModuloGestionDocumental,
  TipoDocumento,
} from '../modelos/documentos';

export interface FiltrosDocumentos {
  search?: string;
  fo_tipo_documento?: number;
  fo_categoria_documento?: number;
  fecha_creacion?: string;
}

export interface DocumentoSubir {
  titulo: string;
  version: string;
  archivo: File;
  fo_tipo_documento: number;
  fo_categoria_documento: number;
  fo_mod_doc: number;
}

export type DocumentoActualizar = Partial<{
  titulo: string;
  version: string;
  fo_tipo_documento: number;
  fo_categoria_documento: number;
}>;

@Injectable({
  providedIn: 'root'
})
export class DocumentosService {

  private http = inject(HttpClient);

  listarModuloDocumental(): Observable<ModuloGestionDocumental[]> {
    return this.http.get<ModuloGestionDocumental[]>(`${environment.apiUrl}/modulo-gestion-documental/`);
  }

  listarTipos(): Observable<TipoDocumento[]> {
    return this.http.get<TipoDocumento[]>(`${environment.apiUrl}/tipos-documento/`);
  }

  crearTipo(nombre_tipo: string): Observable<TipoDocumento> {
    return this.http.post<TipoDocumento>(`${environment.apiUrl}/tipos-documento/`, { nombre_tipo });
  }

  listarCategorias(): Observable<CategoriaDocumento[]> {
    return this.http.get<CategoriaDocumento[]>(`${environment.apiUrl}/categorias-documento/`);
  }

  crearCategoria(nombre_categoria: string, fo_mod_doc: number): Observable<CategoriaDocumento> {
    return this.http.post<CategoriaDocumento>(`${environment.apiUrl}/categorias-documento/`, { nombre_categoria, fo_mod_doc });
  }

  listarDocumentos(filtros?: FiltrosDocumentos): Observable<Documento[]> {
    let params = new HttpParams();
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    if (filtros?.fo_tipo_documento) {
      params = params.set('fo_tipo_documento', filtros.fo_tipo_documento);
    }
    if (filtros?.fo_categoria_documento) {
      params = params.set('fo_categoria_documento', filtros.fo_categoria_documento);
    }
    if (filtros?.fecha_creacion) {
      params = params.set('fecha_creacion', filtros.fecha_creacion);
    }
    return this.http.get<Documento[]>(`${environment.apiUrl}/documentos/`, { params });
  }

  obtenerDocumento(id: number): Observable<Documento> {
    return this.http.get<Documento>(`${environment.apiUrl}/documentos/${id}/`);
  }

  subirDocumento(datos: DocumentoSubir): Observable<Documento> {
    const formData = new FormData();
    formData.set('titulo', datos.titulo);
    formData.set('version', datos.version);
    formData.set('archivo', datos.archivo);
    formData.set('fo_tipo_documento', String(datos.fo_tipo_documento));
    formData.set('fo_categoria_documento', String(datos.fo_categoria_documento));
    formData.set('fo_mod_doc', String(datos.fo_mod_doc));
    return this.http.post<Documento>(`${environment.apiUrl}/documentos/`, formData);
  }

  actualizarDocumento(id: number, datos: DocumentoActualizar): Observable<Documento> {
    return this.http.patch<Documento>(`${environment.apiUrl}/documentos/${id}/`, datos);
  }

  eliminarDocumento(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/documentos/${id}/`);
  }

  // Se descarga como blob para que el interceptor adjunte el token; un <a href> directo
  // no lo enviaría y la descarga no quedaría registrada en el historial.
  descargarDocumento(id: number): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/documentos/${id}/descargar/`, { responseType: 'blob' });
  }

  listarHistorial(filtros?: { fo_documento?: number; accion?: string }): Observable<HistorialAccesoDocumento[]> {
    let params = new HttpParams();
    if (filtros?.fo_documento) {
      params = params.set('fo_documento', filtros.fo_documento);
    }
    if (filtros?.accion) {
      params = params.set('accion', filtros.accion);
    }
    return this.http.get<HistorialAccesoDocumento[]>(`${environment.apiUrl}/historial-documentos/`, { params });
  }

  listarInstitucionales(): Observable<DocumentoInstitucional[]> {
    return this.http.get<DocumentoInstitucional[]>(`${environment.apiUrl}/documentos-institucionales/`);
  }

  subirInstitucional(titulo: string, descripcion: string, archivo: File): Observable<DocumentoInstitucional> {
    const formData = new FormData();
    formData.set('titulo', titulo);
    formData.set('descripcion', descripcion);
    formData.set('archivo', archivo);
    return this.http.post<DocumentoInstitucional>(`${environment.apiUrl}/documentos-institucionales/`, formData);
  }

  eliminarInstitucional(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/documentos-institucionales/${id}/`);
  }

}
