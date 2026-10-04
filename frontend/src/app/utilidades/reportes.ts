import { HttpErrorResponse } from '@angular/common/http';
import { FormatoExportacion } from '../modelos/reportes';
import { mensajeError } from './errores';

export const EXTENSIONES_IMPORTACION: readonly string[] = ['csv', 'xlsx'];
export const LIMITE_ARCHIVO_IMPORTACION = 10 * 1024 * 1024;
export const MIN_ARCHIVOS_CONSOLIDADO = 2;
export const MAX_ARCHIVOS_CONSOLIDADO = 20;
export const MAX_DIAS_RANGO = 366;

// Nombre legible de cada formato de exportación.
export const ETIQUETA_FORMATO: Record<FormatoExportacion, string> = {
  pdf: 'PDF',
  xlsx: 'Excel',
  docx: 'Word'
};

export const FORMATOS_EXPORTACION: readonly FormatoExportacion[] = ['pdf', 'xlsx', 'docx'];

// Frase descriptiva de cada informe de gestión, por clave de tipo.
export const DESCRIPCION_INFORME: Record<string, string> = {
  soporte: 'Tickets creados, por estado, categoría y prioridad, y tiempo medio de resolución.',
  recursos: 'Pedidos de recursos por estado, tipo y prioridad, con los pendientes de atender.',
  compras: 'Solicitudes de compra por estado, total estimado y comprado, y artículos más pedidos.',
  capacitacion: 'Capacitaciones del periodo, participantes, porcentaje de asistencia y cursos por estado.',
  proveedores: 'Acuerdos por estado, proveedores registrados y necesidades de capacitación externa.',
  asistente: 'Consultas a Triny, porcentaje resueltas y útiles, y preguntas sin respuesta más frecuentes.',
  general: 'Indicadores clave de todos los módulos en un solo informe.'
};

export const ICONO_INFORME: Record<string, string> = {
  soporte: 'bi-headset',
  recursos: 'bi-box-seam',
  compras: 'bi-bag',
  capacitacion: 'bi-mortarboard',
  proveedores: 'bi-truck',
  asistente: 'bi-robot',
  general: 'bi-speedometer2'
};

export function descripcionInforme(clave: string | null): string {
  return (clave && DESCRIPCION_INFORME[clave]) || 'Informe de gestión.';
}

// --- Fechas (es-CO) ---

const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatoFechaHora = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

// Convierte 'AAAA-MM-DD' en fecha local (sin el desfase de zona horaria de new Date(texto)).
export function fechaDesdeIso(iso: string): Date {
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

export function aIso(fecha: Date): string {
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mm}-${dd}`;
}

export function formatearFecha(iso: string | null | undefined): string {
  return iso ? formatoFecha.format(fechaDesdeIso(iso)) : '';
}

export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const fecha = new Date(iso);
  return isNaN(fecha.getTime()) ? '' : formatoFechaHora.format(fecha);
}

export interface RangoFechas {
  desde: string;
  hasta: string;
}

export function ultimos30Dias(hoy = new Date()): RangoFechas {
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 29);
  return { desde: aIso(desde), hasta: aIso(hoy) };
}

export function esteMes(hoy = new Date()): RangoFechas {
  return { desde: aIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1)), hasta: aIso(hoy) };
}

export function mesAnterior(hoy = new Date()): RangoFechas {
  return {
    desde: aIso(new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1)),
    hasta: aIso(new Date(hoy.getFullYear(), hoy.getMonth(), 0))
  };
}

// Días del rango, ambos extremos incluidos.
export function diasDelRango(desde: string, hasta: string): number {
  const ms = fechaDesdeIso(hasta).getTime() - fechaDesdeIso(desde).getTime();
  return Math.round(ms / 86400000) + 1;
}

// Mensaje de error del rango, o null si es válido.
export function errorDeRango(desde: string, hasta: string): { campo: 'desde' | 'hasta'; mensaje: string } | null {
  if (!desde) {
    return { campo: 'desde', mensaje: 'Este campo es obligatorio' };
  }
  if (!hasta) {
    return { campo: 'hasta', mensaje: 'Este campo es obligatorio' };
  }
  if (desde > hasta) {
    return { campo: 'desde', mensaje: 'La fecha inicial no puede ser posterior a la final.' };
  }
  if (diasDelRango(desde, hasta) > MAX_DIAS_RANGO) {
    return { campo: 'hasta', mensaje: `El rango máximo es de ${MAX_DIAS_RANGO} días.` };
  }
  return null;
}

// --- Números (es-CO) ---

const formatoNumero = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 2,
  // En 'es' los números de 4 cifras no se agrupan por defecto; se fuerza el punto de miles.
  useGrouping: 'always'
} as unknown as Intl.NumberFormatOptions);

// Los números se formatean; el texto (por ejemplo un rango de fechas) se muestra tal cual.
export function formatearNumero(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) {
    return '';
  }
  return typeof valor === 'number' ? formatoNumero.format(valor) : valor;
}

export function formatearTamano(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Valida extensión (.csv/.xlsx) y tamaño; devuelve el mensaje de error o null.
export function errorArchivoImportacion(archivo: File): string | null {
  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
  if (!EXTENSIONES_IMPORTACION.includes(extension)) {
    return 'Tipo de archivo no permitido. Solo se aceptan archivos .csv y .xlsx.';
  }
  if (archivo.size > LIMITE_ARCHIVO_IMPORTACION) {
    return 'El archivo supera el límite de 10 MB.';
  }
  if (archivo.size === 0) {
    return 'El archivo está vacío.';
  }
  return null;
}

// --- Descargas y errores ---

// Nombre de archivo del encabezado Content-Disposition; si el navegador no lo expone se usa el de respaldo.
export function nombreDeContentDisposition(encabezado: string | null, respaldo: string): string {
  const coincidencia = encabezado?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (!coincidencia) {
    return respaldo;
  }
  try {
    return decodeURIComponent(coincidencia[1]);
  } catch {
    return coincidencia[1];
  }
}

export interface ErroresDeCampos {
  porCampo: Record<string, string>;
  general: string | null;
}

// Separa los errores 400 del API por campo (los de `campos`); el resto va como mensaje general.
export function erroresPorCampo(error: unknown, campos: readonly string[], porDefecto: string): ErroresDeCampos {
  const resultado: ErroresDeCampos = { porCampo: {}, general: null };
  const cuerpo: unknown = error instanceof HttpErrorResponse ? error.error : null;

  if (cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo)) {
    const registro = cuerpo as Record<string, unknown>;
    for (const campo of campos) {
      const valor = registro[campo];
      if (Array.isArray(valor) && typeof valor[0] === 'string') {
        resultado.porCampo[campo] = valor[0];
      } else if (typeof valor === 'string') {
        resultado.porCampo[campo] = valor;
      }
    }
    if (Object.keys(resultado.porCampo).length > 0) {
      return resultado;
    }
  }

  resultado.general = mensajeError(error, porDefecto);
  return resultado;
}
