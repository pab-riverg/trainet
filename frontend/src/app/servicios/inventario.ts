import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CategoriaContenido,
  Contenido,
  EstadoContenido,
  ModuloInventarioContenido,
  TipoContenido,
} from '../modelos/inventario';

export interface FiltrosContenidos {
  search?: string;
  fo_categoria_cont?: number;
  fo_estado_cont?: number;
  tipo_contenido?: string;
  fecha_creacion?: string;
}

export interface ContenidoSubir {
  nombre_contenido: string;
  tipo_contenido: TipoContenido;
  archivo: File;
  fo_categoria_cont: number;
  fo_estado_cont: number;
  fo_mod_inv: number;
}

export type ContenidoActualizar = Partial<{
  nombre_contenido: string;
  tipo_contenido: TipoContenido;
  fo_categoria_cont: number;
  fo_estado_cont: number;
}>;

@Injectable({
  providedIn: 'root'
})
export class InventarioService {

  private http = inject(HttpClient);

  listarModuloInventario(): Observable<ModuloInventarioContenido[]> {
    return this.http.get<ModuloInventarioContenido[]>(`${environment.apiUrl}/modulo-inventario-contenido/`);
  }

  listarCategorias(): Observable<CategoriaContenido[]> {
    return this.http.get<CategoriaContenido[]>(`${environment.apiUrl}/categorias-contenido/`);
  }

  crearCategoria(nombre_categoria: string): Observable<CategoriaContenido> {
    return this.http.post<CategoriaContenido>(`${environment.apiUrl}/categorias-contenido/`, { nombre_categoria });
  }

  listarEstados(): Observable<EstadoContenido[]> {
    return this.http.get<EstadoContenido[]>(`${environment.apiUrl}/estados-contenido/`);
  }

  crearEstado(nombre_estado: string): Observable<EstadoContenido> {
    return this.http.post<EstadoContenido>(`${environment.apiUrl}/estados-contenido/`, { nombre_estado });
  }

  listarContenidos(filtros?: FiltrosContenidos): Observable<Contenido[]> {
    let params = new HttpParams();
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    if (filtros?.fo_categoria_cont) {
      params = params.set('fo_categoria_cont', filtros.fo_categoria_cont);
    }
    if (filtros?.fo_estado_cont) {
      params = params.set('fo_estado_cont', filtros.fo_estado_cont);
    }
    if (filtros?.tipo_contenido) {
      params = params.set('tipo_contenido', filtros.tipo_contenido);
    }
    if (filtros?.fecha_creacion) {
      params = params.set('fecha_creacion', filtros.fecha_creacion);
    }
    return this.http.get<Contenido[]>(`${environment.apiUrl}/contenidos/`, { params });
  }

  subirContenido(datos: ContenidoSubir): Observable<Contenido> {
    const formData = new FormData();
    formData.set('nombre_contenido', datos.nombre_contenido);
    formData.set('tipo_contenido', datos.tipo_contenido);
    formData.set('archivo', datos.archivo);
    formData.set('fo_categoria_cont', String(datos.fo_categoria_cont));
    formData.set('fo_estado_cont', String(datos.fo_estado_cont));
    formData.set('fo_mod_inv', String(datos.fo_mod_inv));
    return this.http.post<Contenido>(`${environment.apiUrl}/contenidos/`, formData);
  }

  // Con archivo se envía un solo FormData (reemplazo del material); sin archivo, JSON.
  actualizarContenido(id: number, datos: ContenidoActualizar, archivo?: File): Observable<Contenido> {
    const url = `${environment.apiUrl}/contenidos/${id}/`;
    if (!archivo) {
      return this.http.patch<Contenido>(url, datos);
    }

    const formData = new FormData();
    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined) {
        formData.set(clave, String(valor));
      }
    }
    formData.set('archivo', archivo);
    return this.http.patch<Contenido>(url, formData);
  }

  eliminarContenido(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/contenidos/${id}/`);
  }

  // Se descarga como blob para que el interceptor adjunte el token de autenticación.
  descargarContenido(id: number): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/contenidos/${id}/descargar/`, { responseType: 'blob' });
  }

}
