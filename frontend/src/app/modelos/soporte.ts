export interface ModuloSoporteTecnico {
  id: number;
  tiempo_respuesta: number;
  fo_sistema: number;
}

export interface CategoriaTicket {
  id: number;
  nombre_categoria: string;
}

export type EstadoTicket = 'abierto' | 'en_proceso' | 'resuelto' | 'cerrado';

export type PrioridadTicket = 'baja' | 'media' | 'alta' | 'urgente';

export interface TicketSoporte {
  id: number;
  fecha_creacion: string;
  prioridad: PrioridadTicket;
  descripcion: string;
  estado: EstadoTicket;
  observaciones: string;
  tiempo_resolucion: number;
  fecha_resolucion: string | null;
  fo_categoria_ticket: number;
  fo_tecnico: number | null;
  fo_usuario: number;
  fo_mod_soporte: number;
  categoria_nombre?: string;
  usuario_nombre?: string;
  tecnico_nombre?: string | null;
}

export interface TecnicoSoporte {
  id: number;
  fo_usuario: number;
  fo_usuario_nombre?: string;
  especialidad_tecnica: string;
  tickets_resueltos: number;
}

export interface EvidenciaTicket {
  id: number;
  archivo: string;
  fecha_subida: string;
  fo_ticket: number;
}
