// Contratos del módulo Administración. Reflejan las respuestas y entradas de backend/administracion.

export interface Configuracion {
  nombre_equipo: string;
}

export interface ConfiguracionEntrada {
  nombre_equipo: string;
}

export interface SistemaPanel {
  version: string | null;
  // AAAA-MM-DD
  fecha_instalacion: string | null;
  nombre_equipo: string;
  usuarios_activos: number;
}

export interface IndicadorRequisito {
  etiqueta: string;
  valor: string | number;
}

// El API no envía rutas: el frontend decide a dónde redirigir según la clave.
export type ClaveRequisito = 'empleados' | 'capacitacion' | 'documentos' | 'reportes';

export interface RequisitoPanel {
  clave: ClaveRequisito;
  titulo: string;
  descripcion: string;
  indicadores: IndicadorRequisito[];
}

export interface PanelAdministracion {
  sistema: SistemaPanel;
  requisitos: RequisitoPanel[];
}

export interface EventoAuditoria {
  id: number;
  // AAAA-MM-DD
  fecha_evento: string;
  // Fecha y hora ISO con zona horaria.
  fecha_hora: string;
  accion: string;
  accion_etiqueta: string;
  modulo: string;
  modulo_etiqueta: string;
  descripcion: string;
  fo_usuario: number | null;
  // null cuando el evento no tiene usuario (por ejemplo, un inicio de sesión fallido).
  usuario_nombre: string | null;
  ip: string | null;
}

export interface PaginaResultados<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface OpcionCatalogo {
  clave: string;
  etiqueta: string;
}

export interface CatalogoAuditoria {
  acciones: OpcionCatalogo[];
  modulos: OpcionCatalogo[];
}

export interface FiltrosAuditoria {
  accion?: string;
  modulo?: string;
  // AAAA-MM-DD, inclusivos.
  desde?: string;
  hasta?: string;
  search?: string;
  limit?: number;
  offset?: number;
}
