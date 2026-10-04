export const EXTENSIONES_ARCHIVO_ASISTENTE: readonly string[] = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg'];
export const LIMITE_ARCHIVO_ASISTENTE = 10 * 1024 * 1024;
export const MAX_TEXTO_PREGUNTA = 300;

// Íconos que el administrador puede asignar a una categoría.
export const ICONOS_ASISTENTE: readonly { clase: string; etiqueta: string }[] = [
  { clase: 'bi-chat-dots', etiqueta: 'Chat' },
  { clase: 'bi-tools', etiqueta: 'Herramientas' },
  { clase: 'bi-bag', etiqueta: 'Compras' },
  { clase: 'bi-box-seam', etiqueta: 'Recursos' },
  { clase: 'bi-mortarboard', etiqueta: 'Capacitación' },
  { clase: 'bi-folder2-open', etiqueta: 'Documentos' },
  { clase: 'bi-person-circle', etiqueta: 'Cuenta' },
  { clase: 'bi-question-circle', etiqueta: 'Ayuda' },
  { clase: 'bi-shield-check', etiqueta: 'Seguridad' },
  { clase: 'bi-truck', etiqueta: 'Entregas' }
];

// Devuelve un mensaje de error si el archivo no cumple tipo o tamaño, o null si es válido.
export function errorArchivoAsistente(archivo: File): string | null {
  if (archivo.size > LIMITE_ARCHIVO_ASISTENTE) {
    return 'El archivo supera el límite de 10 MB.';
  }
  const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
  if (!EXTENSIONES_ARCHIVO_ASISTENTE.includes(extension)) {
    return `Tipo de archivo no permitido. Extensiones válidas: ${EXTENSIONES_ARCHIVO_ASISTENTE.join(', ')}.`;
  }
  return null;
}

export function etiquetaResuelta(resuelta: boolean): string {
  return resuelta ? 'Resuelta' : 'Sin resolver';
}

export function etiquetaUtil(util: boolean | null): string {
  if (util === null) {
    return 'Sin valorar';
  }
  return util ? 'Útil' : 'No útil';
}
