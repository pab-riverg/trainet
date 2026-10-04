// Roles del módulo de Gestión de Proveedores. Deben mantenerse iguales a las constantes
// ROLES_* de backend/proveedores/permisos.py

export const ROLES_GESTION_PROVEEDORES: readonly string[] = [
  'administrador',
  'encargado_administrativo',
  'recursos_humanos'
];

// Doble check: solo estos roles aprueban o rechazan un acuerdo (ROLES_APROBACION_ACUERDOS en el backend).
export const ROLES_APROBACION_ACUERDOS: readonly string[] = ['administrador', 'directivo'];
