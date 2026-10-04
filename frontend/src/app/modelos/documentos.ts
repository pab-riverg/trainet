export interface ModuloGestionDocumental {
  id: number;
  documentos_almacenados: number;
  fo_sistema: number;
}

export interface TipoDocumento {
  id: number;
  nombre_tipo: string;
}

export interface CategoriaDocumento {
  id: number;
  nombre_categoria: string;
  fo_mod_doc: number;
}

export interface Documento {
  id: number;
  titulo: string;
  fecha_creacion: string;
  version: string;
  archivo: string;
  tamanio: number;
  fo_tipo_documento: number;
  fo_categoria_documento: number;
  fo_mod_doc: number;
  tipo_nombre?: string;
  categoria_nombre?: string;
}

export interface HistorialAccesoDocumento {
  id: number;
  accion: 'consulta' | 'descarga';
  fecha: string;
  fo_documento: number;
  fo_usuario: number;
  documento_titulo?: string;
  usuario_nombre?: string;
}

export interface DocumentoInstitucional {
  id: number;
  titulo: string;
  descripcion: string;
  archivo: string;
  fecha_subida: string;
  fo_usuario: number;
  usuario_nombre?: string;
}
