import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  CatalogoAuditoria,
  Configuracion,
  ConfiguracionEntrada,
  EventoAuditoria,
  FiltrosAuditoria,
  PaginaResultados,
  PanelAdministracion,
} from '../modelos/administracion';

/**
 * Acceso a la API del módulo Administración (prefijo /api/): configuración del sistema,
 * panel y bitácora de auditoría. También guarda el nombre del equipo de trabajo que muestra la barra superior.
 */
@Injectable({
  providedIn: 'root'
})
export class AdministracionService {

  private http = inject(HttpClient);

  private url(recurso: string): string {
    return `${environment.apiUrl}/${recurso}/`;
  }

  // --- Nombre del equipo (estado compartido) ---

  private nombreEquipoInterno = signal('');
  // Solo lectura hacia afuera; cadena vacía mientras no ha cargado.
  readonly nombreEquipo = this.nombreEquipoInterno.asReadonly();

  // Lo llama la barra superior al crearse (inicio de sesión o recarga con sesión activa).
  recargarNombreEquipo(): void {
    this.obtenerConfiguracion().subscribe({ error: () => { /* sin nombre: la barra queda vacía */ } });
  }

  // Lo llama la barra superior al destruirse (cierre de sesión), para que el siguiente usuario no vea un valor viejo.
  limpiarNombreEquipo(): void {
    this.nombreEquipoInterno.set('');
  }

  // --- Configuración ---

  // Cualquier usuario autenticado puede leerla.
  obtenerConfiguracion(): Observable<Configuracion> {
    return this.http.get<Configuracion>(this.url('configuracion')).pipe(
      tap(configuracion => this.nombreEquipoInterno.set(configuracion.nombre_equipo))
    );
  }

  // Solo el administrador. El API recorta espacios y valida 1 a 60 caracteres; al guardar, la barra cambia al instante.
  actualizarConfiguracion(datos: ConfiguracionEntrada): Observable<Configuracion> {
    return this.http.patch<Configuracion>(this.url('configuracion'), datos).pipe(
      tap(configuracion => this.nombreEquipoInterno.set(configuracion.nombre_equipo))
    );
  }

  // --- Panel ---

  obtenerPanel(): Observable<PanelAdministracion> {
    return this.http.get<PanelAdministracion>(`${this.url('administracion')}panel/`);
  }

  // --- Bitácora de auditoría (solo lectura) ---

  listarAuditoria(filtros?: FiltrosAuditoria): Observable<PaginaResultados<EventoAuditoria>> {
    let params = new HttpParams();
    if (filtros?.accion) {
      params = params.set('accion', filtros.accion);
    }
    if (filtros?.modulo) {
      params = params.set('modulo', filtros.modulo);
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
    if (filtros?.limit !== undefined) {
      params = params.set('limit', filtros.limit);
    }
    if (filtros?.offset !== undefined) {
      params = params.set('offset', filtros.offset);
    }
    return this.http.get<PaginaResultados<EventoAuditoria>>(this.url('auditoria'), { params });
  }

  // Acciones y módulos disponibles, para llenar los filtros.
  listarCatalogoAuditoria(): Observable<CatalogoAuditoria> {
    return this.http.get<CatalogoAuditoria>(`${this.url('auditoria')}acciones/`);
  }
}
