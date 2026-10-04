// Contratos del módulo Reportes y Análisis. Reflejan las respuestas y entradas de backend/reportes.

export type OrigenTipo = 'archivo' | 'sistema';

export interface TipoReporte {
  id: number;
  nombre_tipo: string;
  origen: OrigenTipo;
  // Identificador estable de los tipos de sistema (soporte, recursos…). null = sin generador.
  clave: string | null;
  // false en el consolidado: se genera desde archivos, no por rango de fechas.
  requiere_fechas: boolean;
  fo_mod_reportes: number;
}

// --- Archivos importados ---

export type FormatoArchivo = 'csv' | 'xlsx';

export interface ArchivoImportado {
  id: number;
  titulo: string;
  descripcion: string;
  archivo: string;
  archivo_nombre: string | null;
  formato: FormatoArchivo;
  fo_tipo: number;
  tipo_nombre: string;
  // AAAA-MM-DD
  fecha_documento: string;
  fecha_importacion: string;
  filas: number;
  columnas: number;
  encabezados: string[];
  // false = archivado.
  activo: boolean;
  fo_usuario: number;
  usuario_nombre: string;
  fo_mod_reportes: number;
}

export interface ArchivoEntrada {
  titulo: string;
  descripcion: string;
  fo_tipo: number;
  fecha_documento: string;
  archivo: File;
}

// PATCH: el archivo no se puede cambiar.
export interface ArchivoEdicion {
  titulo: string;
  descripcion: string;
  fo_tipo: number;
  fecha_documento: string;
}

export interface FiltrosArchivos {
  tipo?: number;
  anio?: number;
  mes?: number;
  desde?: string;
  hasta?: string;
  // Por defecto el API devuelve solo los activos.
  activo?: boolean;
  search?: string;
}

export interface Carpeta {
  anio: number;
  mes: number;
  mes_nombre: string;
  tipo_id: number;
  tipo_nombre: string;
  total: number;
}

export interface RespuestaCarpetas {
  carpetas: Carpeta[];
  total_general: number;
}

export interface VistaPreviaArchivo {
  encabezados: string[];
  filas: (string | number | null)[][];
  total_filas: number;
}

// --- Informes ---

export interface InformeLista {
  id: number;
  titulo: string;
  fo_tipo_reporte: number;
  tipo_nombre: string;
  tipo_clave: string | null;
  // AAAA-MM-DD
  fecha_generacion: string;
  fo_usuario: number | null;
  usuario_nombre: string | null;
  parametros: ParametrosInforme;
  total_archivos: number;
}

export interface ParametrosInforme {
  desde?: string;
  hasta?: string;
  archivos?: number[];
}

export interface ArchivoDeInforme {
  id: number;
  titulo: string;
}

export interface InformeDetalle extends InformeLista {
  contenido: ContenidoInforme;
  archivos: ArchivoDeInforme[];
}

// Forma única del contenido de TODOS los informes.
export interface ContenidoInforme {
  titulo: string;
  subtitulo: string;
  generado_en: string;
  indicadores: Indicador[];
  secciones: SeccionInforme[];
  graficos: GraficoInforme[];
}

export interface Indicador {
  etiqueta: string;
  valor: string | number;
}

export type CeldaInforme = string | number | null;

export interface SeccionInforme {
  titulo: string;
  columnas: string[];
  filas: CeldaInforme[][];
  nota: string | null;
}

export interface SerieGrafico {
  nombre: string;
  valores: number[];
}

export interface GraficoInforme {
  titulo: string;
  tipo: 'barras';
  etiquetas: string[];
  series: SerieGrafico[];
}

export interface FiltrosInformes {
  tipo?: number;
  desde?: string;
  hasta?: string;
  search?: string;
}

export interface GenerarInformeEntrada {
  // Clave del tipo de sistema (por ejemplo 'soporte').
  tipo: string;
  desde?: string;
  hasta?: string;
}

export interface ConsolidarEntrada {
  // De 2 a 20 archivos activos.
  archivos: number[];
  titulo?: string;
}

export type FormatoExportacion = 'pdf' | 'xlsx' | 'docx';
