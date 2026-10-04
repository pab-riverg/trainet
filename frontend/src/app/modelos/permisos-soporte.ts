// Roles con permisos especiales en el módulo de Soporte Técnico. Deben mantenerse
// iguales a backend/soporte/views.py

export const ROLES_GESTION_TICKETS: readonly string[] = ['tecnico_soporte', 'administrador'];

export const ROLES_REASIGNAR_TICKETS: readonly string[] = ['administrador'];
