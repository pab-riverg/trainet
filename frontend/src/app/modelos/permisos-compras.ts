// Roles del módulo de Compras Internas. Deben mantenerse iguales a las constantes
// ROLES_* de backend/compras/permisos.py

export const ROLES_SOLICITUD_COMPRAS: readonly string[] = ['empleado', 'supervisor'];

export const ROLES_GESTION_COMPRAS: readonly string[] = ['administrador', 'encargado_administrativo'];

export const ROLES_APROBACION_COMPRAS: readonly string[] = ['administrador', 'directivo'];

// Solo el administrador ajusta el presupuesto disponible del módulo.
export const ROLES_PRESUPUESTO_COMPRAS: readonly string[] = ['administrador'];

export const ROLES_VER_TODAS_SOLICITUDES: readonly string[] = ['administrador', 'directivo', 'encargado_administrativo'];

export const ROLES_VISTA_COMPRAS: readonly string[] = [
  'empleado',
  'supervisor',
  'administrador',
  'encargado_administrativo',
  'directivo'
];
