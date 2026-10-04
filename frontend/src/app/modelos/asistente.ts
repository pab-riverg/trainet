// Contratos del módulo Asistente Virtual "Triny". Reflejan las respuestas y entradas de backend/asistente.

export interface CategoriaAsistente {
  id: number;
  nombre: string;
  // Clase de Bootstrap Icons, por ejemplo 'bi-tools'.
  icono: string;
  orden: number;
  fo_mod_asistente: number;
  // Solo cuenta las preguntas activas.
  total_consultas: number;
}

export interface CategoriaAsistenteEntrada {
  nombre: string;
  icono?: string;
  orden?: number;
}

export interface ConsultaFrecuente {
  id: number;
  pregunta: string;
  respuesta: string;
  fo_categoria: number | null;
  categoria_nombre: string | null;
  categoria_icono: string | null;
  // Separadas por comas; sirven para mejorar la coincidencia.
  palabras_clave: string;
  archivo: string | null;
  archivo_nombre: string | null;
  activa: boolean;
  fo_mod_asistente: number;
}

export interface ConsultaFrecuenteEntrada {
  pregunta: string;
  respuesta: string;
  fo_categoria: number | null;
  palabras_clave: string;
  activa: boolean;
  // Solo se envía cuando se adjunta o reemplaza el archivo (la petición pasa a multipart).
  archivo?: File | null;
}

export interface FiltrosConsultas {
  categoria?: number;
  search?: string;
  // Solo el administrador puede filtrar por activa; los demás reciben siempre las activas.
  activa?: boolean;
}

// Respuesta completa que devuelven preguntar y seleccionar.
export interface RespuestaAsistente {
  id: number;
  pregunta: string;
  respuesta: string;
  categoria_nombre: string | null;
  archivo: string | null;
  archivo_nombre: string | null;
}

export interface SugerenciaAsistente {
  id: number;
  pregunta: string;
}

export interface ResultadoConsulta {
  historial_id: number;
  resuelta: boolean;
  respuesta: RespuestaAsistente | null;
  // Solo vienen cuando no hubo respuesta.
  sugerencias: SugerenciaAsistente[];
}

export type OrigenConsulta = 'texto' | 'menu';

export interface HistorialConsulta {
  id: number;
  fo_usuario: number;
  usuario_nombre: string;
  texto: string;
  origen: OrigenConsulta;
  // Id de la consulta frecuente que se respondió, o null.
  consulta: number | null;
  consulta_pregunta: string | null;
  resuelta: boolean;
  // null = sin valorar.
  util: boolean | null;
  fecha: string;
}

export interface FiltrosHistorial {
  resuelta?: boolean;
  util?: boolean;
  usuario?: number;
  search?: string;
}
