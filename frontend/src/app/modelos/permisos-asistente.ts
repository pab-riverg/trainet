// Roles del módulo Asistente Virtual. Deben mantenerse iguales a ROLES_ENTRENAMIENTO_ASISTENTE
// de backend/asistente/permisos.py

// Crean, editan y eliminan categorías y preguntas, y ven el historial de todos los usuarios.
export const ROLES_ENTRENAMIENTO_ASISTENTE: readonly string[] = ['administrador'];

// Cualquier usuario autenticado puede preguntar, ver su historial y descargar archivos de respuestas.
export function puedeEntrenar(rol: string | null | undefined): boolean {
  return ROLES_ENTRENAMIENTO_ASISTENTE.includes(rol ?? '');
}
