// Roles con permiso de escritura (crear/editar/eliminar) por recurso del módulo de
// Capacitación. Deben mantenerse iguales a backend/capacitacion/views.py

export const ROLES_GESTION_CURSOS: readonly string[] = ['capacitador', 'encargado_formacion', 'administrador'];

export const ROLES_GESTION_CAPACITACIONES: readonly string[] = [
  'recursos_humanos',
  'capacitador',
  'encargado_formacion',
  'administrador'
];

export const ROLES_GESTION_PARTICIPANTES: readonly string[] = [
  'recursos_humanos',
  'supervisor',
  'capacitador',
  'encargado_formacion',
  'administrador'
];

export const ROLES_GESTION_EVIDENCIAS: readonly string[] = [
  'recursos_humanos',
  'capacitador',
  'encargado_formacion',
  'administrador'
];
