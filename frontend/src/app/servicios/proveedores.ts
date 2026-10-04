import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ContratoProveedor,
  CotizacionProveedor,
  EstadoCotizacion,
  ModuloGestionProveedores,
  NecesidadCapacitacion,
  Proveedor,
} from '../modelos/proveedores';

export interface FiltrosProveedores {
  search?: string;
  estado?: string;
  especialidad?: string;
}

export type ProveedorCrear = Pick<Proveedor, 'razon_social' | 'rut' | 'especialidad' | 'contacto' | 'email' | 'telefono' | 'fo_mod_prov'>;

export type ProveedorActualizar = Partial<Omit<Proveedor, 'id' | 'calificacion' | 'tiene_cotizacion_aprobada'>>;

export interface ContratoCrear {
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  fo_proveedor: number;
  confirmacion?: string;
}

export type ContratoActualizar = Partial<{
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  confirmacion: string;
}>;

export interface NecesidadCrear {
  tema: string;
  area: string;
  observaciones: string;
  fo_mod_prov: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProveedoresService {

  private http = inject(HttpClient);

  private url(recurso: string): string {
    return `${environment.apiUrl}/${recurso}/`;
  }

  // --- Módulo y proveedores ---

  listarModuloProveedores(): Observable<ModuloGestionProveedores[]> {
    return this.http.get<ModuloGestionProveedores[]>(this.url('modulo-gestion-proveedores'));
  }

  listarProveedores(filtros?: FiltrosProveedores): Observable<Proveedor[]> {
    let params = new HttpParams();
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros?.especialidad) {
      params = params.set('especialidad', filtros.especialidad);
    }
    return this.http.get<Proveedor[]>(this.url('proveedores'), { params });
  }

  obtenerProveedor(id: number): Observable<Proveedor> {
    return this.http.get<Proveedor>(`${this.url('proveedores')}${id}/`);
  }

  crearProveedor(datos: ProveedorCrear): Observable<Proveedor> {
    return this.http.post<Proveedor>(this.url('proveedores'), datos);
  }

  actualizarProveedor(id: number, datos: ProveedorActualizar): Observable<Proveedor> {
    return this.http.patch<Proveedor>(`${this.url('proveedores')}${id}/`, datos);
  }

  eliminarProveedor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url('proveedores')}${id}/`);
  }

  historialProveedor(id: number): Observable<ContratoProveedor[]> {
    return this.http.get<ContratoProveedor[]>(`${this.url('proveedores')}${id}/historial/`);
  }

  // --- Cotizaciones ---

  listarCotizaciones(fo_proveedor?: number): Observable<CotizacionProveedor[]> {
    let params = new HttpParams();
    if (fo_proveedor) {
      params = params.set('fo_proveedor', fo_proveedor);
    }
    return this.http.get<CotizacionProveedor[]>(this.url('cotizaciones-proveedor'), { params });
  }

  subirCotizacion(archivo: File, fo_proveedor: number): Observable<CotizacionProveedor> {
    const formData = new FormData();
    formData.set('archivo', archivo);
    formData.set('fo_proveedor', String(fo_proveedor));
    return this.http.post<CotizacionProveedor>(this.url('cotizaciones-proveedor'), formData);
  }

  actualizarEstadoCotizacion(id: number, estado: EstadoCotizacion): Observable<CotizacionProveedor> {
    return this.http.patch<CotizacionProveedor>(`${this.url('cotizaciones-proveedor')}${id}/`, { estado });
  }

  eliminarCotizacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url('cotizaciones-proveedor')}${id}/`);
  }

  // Se descarga como blob para que el interceptor adjunte el token de autenticación.
  descargarCotizacion(id: number): Observable<Blob> {
    return this.http.get(`${this.url('cotizaciones-proveedor')}${id}/descargar/`, { responseType: 'blob' });
  }

  // --- Acuerdos / contratos ---

  listarContratos(filtros?: { fo_proveedor?: number; estado?: string }): Observable<ContratoProveedor[]> {
    let params = new HttpParams();
    if (filtros?.fo_proveedor) {
      params = params.set('fo_proveedor', filtros.fo_proveedor);
    }
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    return this.http.get<ContratoProveedor[]>(this.url('contratos-proveedor'), { params });
  }

  // Con archivo adjunto se envía FormData; sin archivo, JSON.
  crearContrato(datos: ContratoCrear, archivo?: File): Observable<ContratoProveedor> {
    return this.http.post<ContratoProveedor>(this.url('contratos-proveedor'), this.cuerpoContrato(datos, archivo));
  }

  actualizarContrato(id: number, datos: ContratoActualizar, archivo?: File): Observable<ContratoProveedor> {
    return this.http.patch<ContratoProveedor>(`${this.url('contratos-proveedor')}${id}/`, this.cuerpoContrato(datos, archivo));
  }

  eliminarContrato(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url('contratos-proveedor')}${id}/`);
  }

  // Aprobar o rechazar un acuerdo pendiente (solo directivo y administrador). El motivo es obligatorio al rechazar.
  decidirContrato(id: number, datos: { estado: 'aprobado' | 'rechazado'; motivo?: string }): Observable<ContratoProveedor> {
    return this.http.post<ContratoProveedor>(`${this.url('contratos-proveedor')}${id}/decidir/`, datos);
  }

  descargarContrato(id: number): Observable<Blob> {
    return this.http.get(`${this.url('contratos-proveedor')}${id}/descargar/`, { responseType: 'blob' });
  }

  private cuerpoContrato(datos: object, archivo?: File): object | FormData {
    if (!archivo) {
      return datos;
    }
    const formData = new FormData();
    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined && valor !== null) {
        formData.set(clave, String(valor));
      }
    }
    formData.set('archivo', archivo);
    return formData;
  }

  // --- Necesidades de capacitación externa ---

  listarNecesidades(): Observable<NecesidadCapacitacion[]> {
    return this.http.get<NecesidadCapacitacion[]>(this.url('necesidades-capacitacion-externa'));
  }

  crearNecesidad(datos: NecesidadCrear): Observable<NecesidadCapacitacion> {
    return this.http.post<NecesidadCapacitacion>(this.url('necesidades-capacitacion-externa'), datos);
  }

}
