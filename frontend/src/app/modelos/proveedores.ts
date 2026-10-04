export interface ModuloGestionProveedores {
  id: number;
  fo_sistema: number;
}

export type EstadoProveedor = 'sin_contratar' | 'contratado' | 'inactivo';

export type EstadoCotizacion = 'pendiente' | 'aprobada' | 'rechazada';

export type EstadoContrato = 'pendiente_aprobacion' | 'vigente' | 'finalizado' | 'cancelado' | 'rechazado';

export interface Proveedor {
  id: number;
  razon_social: string;
  contacto: string;
  email: string;
  telefono: string;
  calificacion: number;
  rut: string;
  especialidad: string;
  estado: EstadoProveedor;
  fo_mod_prov: number;
  tiene_cotizacion_aprobada?: boolean;
}

export interface CotizacionProveedor {
  id: number;
  archivo: string;
  fecha_carga: string;
  estado: EstadoCotizacion;
  fo_proveedor: number;
  fo_usuario: number | null;
  proveedor_nombre?: string;
  usuario_nombre?: string | null;
}

export interface ContratoProveedor {
  id: number;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: EstadoContrato;
  confirmacion: string;
  motivo_decision: string;
  fecha_decision: string | null;
  archivo: string | null;
  fo_proveedor: number;
  fo_cotizacion: number | null;
  fo_usuario: number | null;
  fo_aprobador: number | null;
  proveedor_nombre?: string;
  usuario_nombre?: string | null;
  aprobador_nombre?: string | null;
  cotizacion_estado?: EstadoCotizacion | null;
  cotizacion_archivo?: string | null;
}

export interface NecesidadCapacitacion {
  id: number;
  tema: string;
  area: string;
  fecha: string;
  observaciones: string;
  fo_usuario: number;
  fo_mod_prov: number;
  usuario_nombre?: string;
}
