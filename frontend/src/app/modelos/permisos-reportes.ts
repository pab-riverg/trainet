// Permisos del módulo Reportes y Análisis. Deben mantenerse iguales a PERMISOS_REPORTES y las constantes
// ROLES_* de backend/reportes/permisos.py. Aquí solo se decide qué mostrar u ocultar: el backend valida cada
// acción y responde 403 aunque la interfaz se manipule. Los tipos de informe que se listan salen siempre de la API.

// Valor de `tipos` para los roles sin restricción de tipo de informe.
export const TODOS_LOS_TIPOS = '*';

// Clave del informe que produce el consolidado de archivos.
export const TIPO_CONSOLIDADO = 'consolidado';

export interface PermisosReportes {
  // Importar archivos y gestionar (editar, archivar, restaurar, eliminar) los propios.
  puedeImportar: boolean;
  // Consolidar archivos en un informe.
  puedeConsolidar: boolean;
  // Claves de informe que puede generar, ver y exportar.
  tipos: readonly string[] | typeof TODOS_LOS_TIPOS;
}

export const PERMISOS_REPORTES: Readonly<Record<string, PermisosReportes>> = {
  administrador: { puedeImportar: true, puedeConsolidar: true, tipos: TODOS_LOS_TIPOS },
  directivo: { puedeImportar: false, puedeConsolidar: true, tipos: TODOS_LOS_TIPOS },
  recursos_humanos: { puedeImportar: true, puedeConsolidar: true, tipos: ['capacitacion', 'asistente'] },
  supervisor: { puedeImportar: false, puedeConsolidar: false, tipos: ['capacitacion', 'recursos'] },
  encargado_documental: { puedeImportar: true, puedeConsolidar: true, tipos: [TIPO_CONSOLIDADO] }
};

// Roles que ven todos los archivos importados (el resto de roles con acceso ve solo los suyos).
const ROLES_VEN_TODOS_LOS_ARCHIVOS: readonly string[] = ['administrador', 'directivo'];

// Eliminar informes y gestionar los catálogos.
export const ROLES_GESTION_REPORTES: readonly string[] = ['administrador'];

function permisosDe(rol: string | null | undefined): PermisosReportes | null {
  return PERMISOS_REPORTES[rol ?? ''] ?? null;
}

export function puedeGestionar(rol: string | null | undefined): boolean {
  return ROLES_GESTION_REPORTES.includes(rol ?? '');
}

export function puedeLeer(rol: string | null | undefined): boolean {
  return permisosDe(rol) !== null;
}

export function puedeImportar(rol: string | null | undefined): boolean {
  return permisosDe(rol)?.puedeImportar ?? false;
}

export function puedeConsolidar(rol: string | null | undefined): boolean {
  return permisosDe(rol)?.puedeConsolidar ?? false;
}

// La sección Archivos la ven quienes leen todos los archivos (administrador, directivo) y quienes importan.
export function puedeVerArchivos(rol: string | null | undefined): boolean {
  return ROLES_VEN_TODOS_LOS_ARCHIVOS.includes(rol ?? '') || puedeImportar(rol);
}

// Generar un informe de gestión por rango de fechas: requiere algún tipo de sistema distinto del consolidado,
// que se genera desde Archivos.
export function puedeGenerar(rol: string | null | undefined): boolean {
  const tipos = permisosDe(rol)?.tipos;
  if (tipos === undefined) {
    return false;
  }
  return tipos === TODOS_LOS_TIPOS || tipos.some(tipo => tipo !== TIPO_CONSOLIDADO);
}
