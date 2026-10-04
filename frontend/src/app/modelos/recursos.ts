export interface ModuloPedidoRecursos {
  id: number;
  presupuesto_asignado: number;
  fo_sistema: number;
}

export interface TipoRecurso {
  id: number;
  nombre_tipo: string;
  disponible: boolean;
}

export type EstadoSolicitud = 'pendiente' | 'aprobado' | 'rechazado' | 'entregado';

export type PrioridadSolicitud = 'alta' | 'media' | 'baja';

export interface SolicitudRecursos {
  id: number;
  fecha_solicitud: string;
  cantidad: number;
  justificacion: string;
  prioridad: PrioridadSolicitud;
  estado: EstadoSolicitud;
  presupuesto_estimado: number;
  comentario_encargado: string;
  archivo_entrega: string | null;
  fo_tipo_recurso: number;
  fo_usuario: number;
  fo_mod_pedido: number;
  tipo_nombre?: string;
  usuario_nombre?: string;
  tipo_disponible?: boolean;
}
