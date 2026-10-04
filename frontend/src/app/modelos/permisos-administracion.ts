// Roles del módulo Administración. Deben mantenerse iguales a ROLES_ADMINISTRACION
// de backend/administracion/permisos.py

// Panel, bitácora y edición de la configuración. Leer el nombre del equipo es para cualquier usuario autenticado.
export const ROLES_ADMINISTRACION: readonly string[] = ['administrador'];

export function puedeAdministrar(rol: string | null | undefined): boolean {
  return ROLES_ADMINISTRACION.includes(rol ?? '');
}
