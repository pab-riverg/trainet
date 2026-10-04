// Roles con permiso de escritura en el módulo de Inventario de Contenido. Deben mantenerse
// iguales a backend/inventario/views.py

export const ROLES_GESTION_CONTENIDO: readonly string[] = [
  'encargado_formacion',
  'recursos_humanos',
  'capacitador',
  'administrador'
];
