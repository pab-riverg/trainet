export interface ModuloCompras {
  id: number;
  presupuesto_disponible: number;
  fo_sistema: number;
}

export interface CategoriaArticulo {
  id: number;
  nombre: string;
  // Clase de Bootstrap Icons, por ejemplo 'bi-laptop'.
  icono: string;
  proveedores: number[];
  proveedores_nombres: string[];
}

export interface Articulo {
  id: number;
  nombre: string;
  descripcion: string;
  precio_referencia: number;
  disponible: boolean;
  imagen: string | null;
  fo_categoria: number;
  fo_mod_compras: number;
  categoria_nombre?: string;
  categoria_icono?: string;
}

export type EstadoSolicitudCompra =
  | 'pendiente' | 'aprobada' | 'rechazada' | 'comprada' | 'entregada' | 'en_revision' | 'recibida';

export type TipoEventoSolicitud =
  | 'creada' | 'aprobada' | 'rechazada' | 'comprada' | 'entregada' | 'recibida' | 'no_recibida' | 'reentregada' | 'observacion';

// Entrada de la bitácora de una solicitud.
export interface EventoSolicitud {
  id: number;
  tipo: TipoEventoSolicitud;
  detalle: string;
  usuario_nombre: string | null;
  fecha: string;
}

export interface ItemSolicitud {
  id: number;
  fo_articulo: number;
  articulo_nombre?: string;
  categoria_nombre?: string;
  categoria_icono?: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  justificacion: string;
}

export interface SolicitudCompra {
  id: number;
  fecha_solicitud: string;
  area: string;
  nota: string;
  estado: EstadoSolicitudCompra;
  total_estimado: number;
  motivo_decision: string;
  fecha_decision: string | null;
  fo_solicitante: number;
  solicitante_nombre?: string;
  fo_aprobador: number | null;
  aprobador_nombre?: string | null;
  fo_mod_compras: number;
  items: ItemSolicitud[];
  // Compra
  fecha_compra: string | null;
  fo_comprador: number | null;
  comprador_nombre?: string | null;
  fo_orden: number | null;
  fo_cotizacion_elegida: number | null;
  // Entrega, recepción y reclamo
  fecha_entrega: string | null;
  fo_entregado_por: number | null;
  entregado_por_nombre?: string | null;
  fecha_confirmacion: string | null;
  motivo_reclamo: string;
  fecha_reclamo: string | null;
  // Solo viene en el detalle (obtenerSolicitud), no en la lista.
  historial?: EventoSolicitud[];
}

// Cotización de un proveedor para una solicitud aprobada (interna de administración).
export interface CotizacionCompra {
  id: number;
  archivo: string;
  fecha_carga: string;
  monto_total: number;
  iva: number;
  fo_solicitud: number;
  fo_proveedor: number;
  proveedor_nombre?: string | null;
  fo_usuario: number | null;
  usuario_nombre?: string | null;
  es_elegida: boolean;
  // Solo en la respuesta del POST: texto si el proveedor no es de los sugeridos, o null.
  advertencia?: string | null;
}

export interface FacturaCompra {
  id: number;
  archivo: string;
  descripcion: string;
  fecha_carga: string;
  fo_solicitud: number;
  fo_usuario: number | null;
  usuario_nombre?: string | null;
}

export interface ProveedorSugerido {
  id: number;
  razon_social: string;
  especialidad: string;
}

// --- Tipos de entrada ---

export interface CategoriaArticuloEntrada {
  nombre: string;
  icono?: string;
  proveedores?: number[];
}

export interface ArticuloEntrada {
  nombre: string;
  descripcion?: string;
  precio_referencia: number;
  disponible?: boolean;
  fo_categoria: number;
  fo_mod_compras: number;
}

export interface FiltrosArticulos {
  search?: string;
  categoria?: number;
  disponible?: boolean;
}

export interface FiltrosSolicitudesCompra {
  estado?: string;
  search?: string;
}

export interface ItemSolicitudEntrada {
  fo_articulo: number;
  cantidad: number;
  justificacion?: string;
}

export interface SolicitudCompraEntrada {
  area: string;
  nota?: string;
  items: ItemSolicitudEntrada[];
}

export interface DecisionSolicitudCompra {
  estado: 'aprobada' | 'rechazada';
  // Obligatorio siempre, también al aprobar.
  motivo: string;
}

export interface CotizacionEntrada {
  fo_solicitud: number;
  fo_proveedor: number;
  // Incluye el IVA.
  monto_total: number;
  iva?: number;
}

export interface FacturaEntrada {
  fo_solicitud: number;
  descripcion?: string;
}

export interface ConfirmarCompraEntrada {
  cotizacion: number;
  comentario?: string;
}

export interface EntregaEntrada {
  // Obligatoria cuando la solicitud viene de "en revisión".
  nota?: string;
}

export interface ObservacionEntrada {
  // Máximo 500 caracteres; no puede estar en blanco.
  observacion: string;
}

export interface ReclamoEntrada {
  motivo?: string;
}

// Línea del carrito (vive solo en memoria).
export interface LineaCarrito {
  articulo: Articulo;
  cantidad: number;
  justificacion: string;
}
