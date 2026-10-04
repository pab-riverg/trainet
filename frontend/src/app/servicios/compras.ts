import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Articulo,
  ArticuloEntrada,
  CategoriaArticulo,
  CategoriaArticuloEntrada,
  ConfirmarCompraEntrada,
  CotizacionCompra,
  CotizacionEntrada,
  DecisionSolicitudCompra,
  EntregaEntrada,
  FacturaCompra,
  FacturaEntrada,
  FiltrosArticulos,
  FiltrosSolicitudesCompra,
  ModuloCompras,
  ObservacionEntrada,
  ProveedorSugerido,
  ReclamoEntrada,
  SolicitudCompra,
  SolicitudCompraEntrada,
} from '../modelos/compras';

@Injectable({
  providedIn: 'root'
})
export class ComprasService {

  private http = inject(HttpClient);

  private url(recurso: string): string {
    return `${environment.apiUrl}/${recurso}/`;
  }

  // --- Módulo ---

  listarModuloCompras(): Observable<ModuloCompras[]> {
    return this.http.get<ModuloCompras[]>(this.url('modulo-compras-internas'));
  }

  // Solo el administrador puede ajustar el presupuesto disponible (entero >= 0).
  actualizarPresupuesto(id: number, presupuesto_disponible: number): Observable<ModuloCompras> {
    return this.http.patch<ModuloCompras>(`${this.url('modulo-compras-internas')}${id}/`, { presupuesto_disponible });
  }

  // --- Categorías de artículos ---

  listarCategorias(): Observable<CategoriaArticulo[]> {
    return this.http.get<CategoriaArticulo[]>(this.url('categorias-articulo'));
  }

  crearCategoria(datos: CategoriaArticuloEntrada): Observable<CategoriaArticulo> {
    return this.http.post<CategoriaArticulo>(this.url('categorias-articulo'), datos);
  }

  actualizarCategoria(id: number, datos: Partial<CategoriaArticuloEntrada>): Observable<CategoriaArticulo> {
    return this.http.patch<CategoriaArticulo>(`${this.url('categorias-articulo')}${id}/`, datos);
  }

  // Responde 400 si la categoría tiene artículos.
  eliminarCategoria(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url('categorias-articulo')}${id}/`);
  }

  // --- Artículos del catálogo ---

  // Quien solicita compras (empleado, supervisor) recibe siempre solo los artículos disponibles.
  listarArticulos(filtros?: FiltrosArticulos): Observable<Articulo[]> {
    let params = new HttpParams();
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    if (filtros?.categoria) {
      params = params.set('categoria', filtros.categoria);
    }
    if (filtros?.disponible !== undefined) {
      params = params.set('disponible', filtros.disponible);
    }
    return this.http.get<Articulo[]>(this.url('articulos'), { params });
  }

  // Con imagen se envía FormData; sin imagen, JSON.
  crearArticulo(datos: ArticuloEntrada, imagen?: File): Observable<Articulo> {
    return this.http.post<Articulo>(this.url('articulos'), this.cuerpoArticulo(datos, imagen));
  }

  actualizarArticulo(id: number, datos: Partial<ArticuloEntrada>, imagen?: File): Observable<Articulo> {
    return this.http.patch<Articulo>(`${this.url('articulos')}${id}/`, this.cuerpoArticulo(datos, imagen));
  }

  // Responde 400 si el artículo tiene solicitudes (en ese caso se marca como no disponible).
  eliminarArticulo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url('articulos')}${id}/`);
  }

  private cuerpoArticulo(datos: object, imagen?: File): object | FormData {
    if (!imagen) {
      return datos;
    }
    const formData = new FormData();
    for (const [clave, valor] of Object.entries(datos)) {
      if (valor !== undefined && valor !== null) {
        formData.set(clave, String(valor));
      }
    }
    formData.set('imagen', imagen);
    return formData;
  }

  // --- Solicitudes de compra ---

  listarSolicitudes(filtros?: FiltrosSolicitudesCompra): Observable<SolicitudCompra[]> {
    let params = new HttpParams();
    if (filtros?.estado) {
      params = params.set('estado', filtros.estado);
    }
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    return this.http.get<SolicitudCompra[]>(this.url('solicitudes-compra'), { params });
  }

  obtenerSolicitud(id: number): Observable<SolicitudCompra> {
    return this.http.get<SolicitudCompra>(`${this.url('solicitudes-compra')}${id}/`);
  }

  // El servidor fija el solicitante, el estado inicial, los precios y el total estimado.
  crearSolicitud(datos: SolicitudCompraEntrada): Observable<SolicitudCompra> {
    return this.http.post<SolicitudCompra>(this.url('solicitudes-compra'), datos);
  }

  // Solo el solicitante, y solo mientras la solicitud está pendiente.
  cancelarSolicitud(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url('solicitudes-compra')}${id}/`);
  }

  // Solo administrador y directivo; el motivo es obligatorio también al aprobar.
  decidirSolicitud(id: number, datos: DecisionSolicitudCompra): Observable<SolicitudCompra> {
    return this.http.post<SolicitudCompra>(`${this.url('solicitudes-compra')}${id}/decidir/`, datos);
  }

  // --- Cotizaciones (internas de administración: el solicitante no puede leerlas) ---

  listarCotizaciones(fo_solicitud: number): Observable<CotizacionCompra[]> {
    const params = new HttpParams().set('fo_solicitud', fo_solicitud);
    return this.http.get<CotizacionCompra[]>(this.url('cotizaciones-compra'), { params });
  }

  // Solo con la solicitud aprobada. La respuesta puede traer `advertencia` si el proveedor no es de los sugeridos.
  subirCotizacion(datos: CotizacionEntrada, archivo: File): Observable<CotizacionCompra> {
    const formData = new FormData();
    formData.set('fo_solicitud', String(datos.fo_solicitud));
    formData.set('fo_proveedor', String(datos.fo_proveedor));
    formData.set('monto_total', String(datos.monto_total));
    if (datos.iva !== undefined) {
      formData.set('iva', String(datos.iva));
    }
    formData.set('archivo', archivo);
    return this.http.post<CotizacionCompra>(this.url('cotizaciones-compra'), formData);
  }

  // No se puede eliminar la cotización elegida.
  eliminarCotizacion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url('cotizaciones-compra')}${id}/`);
  }

  // Se descarga como blob para que el interceptor adjunte el token de autenticación.
  descargarCotizacion(id: number): Observable<Blob> {
    return this.http.get(`${this.url('cotizaciones-compra')}${id}/descargar/`, { responseType: 'blob' });
  }

  // Proveedores de las categorías de los artículos de la solicitud (orientativo).
  listarProveedoresSugeridos(idSolicitud: number): Observable<ProveedorSugerido[]> {
    return this.http.get<ProveedorSugerido[]>(`${this.url('solicitudes-compra')}${idSolicitud}/proveedores-sugeridos/`);
  }

  // --- Etapas posteriores a la aprobación. Todas devuelven la solicitud completa con su bitácora. ---

  // Administrador y encargado administrativo, solo con la solicitud pendiente. No cambia el estado: el
  // aprobador lee la observación antes de decidir. Devuelve la solicitud con la bitácora actualizada.
  observarSolicitud(id: number, datos: ObservacionEntrada): Observable<SolicitudCompra> {
    return this.http.post<SolicitudCompra>(`${this.url('solicitudes-compra')}${id}/observar/`, datos);
  }

  // Administrador y directivo. Responde 400 con el monto y el presupuesto disponible si no alcanza.
  confirmarCompra(id: number, datos: ConfirmarCompraEntrada): Observable<SolicitudCompra> {
    return this.http.post<SolicitudCompra>(`${this.url('solicitudes-compra')}${id}/confirmar-compra/`, datos);
  }

  // Administrador y encargado administrativo. Desde "en revisión" la nota es obligatoria.
  entregarSolicitud(id: number, datos: EntregaEntrada): Observable<SolicitudCompra> {
    return this.http.post<SolicitudCompra>(`${this.url('solicitudes-compra')}${id}/entregar/`, datos);
  }

  // Solo el solicitante, con la solicitud entregada.
  confirmarRecepcion(id: number): Observable<SolicitudCompra> {
    return this.http.post<SolicitudCompra>(`${this.url('solicitudes-compra')}${id}/confirmar-recepcion/`, {});
  }

  // Solo el solicitante, con la solicitud entregada: pasa a "en revisión".
  reportarNoRecibida(id: number, datos: ReclamoEntrada): Observable<SolicitudCompra> {
    return this.http.post<SolicitudCompra>(`${this.url('solicitudes-compra')}${id}/reportar-no-recibida/`, datos);
  }

  // --- Facturas de la compra ---

  // El solicitante ve las de sus propias solicitudes.
  listarFacturas(fo_solicitud: number): Observable<FacturaCompra[]> {
    const params = new HttpParams().set('fo_solicitud', fo_solicitud);
    return this.http.get<FacturaCompra[]>(this.url('facturas-compra'), { params });
  }

  subirFactura(datos: FacturaEntrada, archivo: File): Observable<FacturaCompra> {
    const formData = new FormData();
    formData.set('fo_solicitud', String(datos.fo_solicitud));
    if (datos.descripcion) {
      formData.set('descripcion', datos.descripcion);
    }
    formData.set('archivo', archivo);
    return this.http.post<FacturaCompra>(this.url('facturas-compra'), formData);
  }

  // Responde 400 si la solicitud ya está recibida.
  eliminarFactura(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url('facturas-compra')}${id}/`);
  }

  descargarFactura(id: number): Observable<Blob> {
    return this.http.get(`${this.url('facturas-compra')}${id}/descargar/`, { responseType: 'blob' });
  }

}
