export interface OpcionRol {
  codigo: string;
  etiqueta: string;
}

export const CATALOGO_ROLES: OpcionRol[] = [
  { codigo: 'administrador', etiqueta: 'Administrador' },
  { codigo: 'directivo', etiqueta: 'Directivo' },
  { codigo: 'supervisor', etiqueta: 'Supervisor' },
  { codigo: 'empleado', etiqueta: 'Empleado' },
  { codigo: 'recursos_humanos', etiqueta: 'Recursos Humanos' },
  { codigo: 'encargado_formacion', etiqueta: 'Encargado de Formación' },
  { codigo: 'encargado_documental', etiqueta: 'Encargado Documental' },
  { codigo: 'capacitador', etiqueta: 'Capacitador' },
  { codigo: 'tecnico_soporte', etiqueta: 'Técnico de Soporte' },
  { codigo: 'encargado_administrativo', etiqueta: 'Encargado Administrativo' },
  { codigo: 'proveedor_contenido', etiqueta: 'Proveedor de Contenido' }
];

export function etiquetaRol(codigo: string | null | undefined): string {
  return CATALOGO_ROLES.find(opcion => opcion.codigo === codigo)?.etiqueta ?? 'Usuario';
}
