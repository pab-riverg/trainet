// Roles con permiso de escritura en el módulo de Gestión Documental. Deben mantenerse
// iguales a backend/documentos/views.py y backend/administracion/views.py

export const ROLES_GESTION_DOCUMENTOS: readonly string[] = ['encargado_documental', 'administrador'];

export const ROLES_GESTION_INSTITUCIONALES: readonly string[] = ['administrador', 'encargado_administrativo'];
