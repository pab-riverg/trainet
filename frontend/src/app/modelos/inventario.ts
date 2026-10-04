export interface ModuloInventarioContenido {
  id: number;
  fo_sistema: number;
}

export interface CategoriaContenido {
  id: number;
  nombre_categoria: string;
}

export interface EstadoContenido {
  id: number;
  nombre_estado: string;
}

export type TipoContenido = 'video' | 'pdf' | 'presentacion' | 'manual' | 'otro';

export interface Contenido {
  id: number;
  nombre_contenido: string;
  tipo_contenido: TipoContenido;
  archivo: string;
  fecha_creacion: string;
  fecha_actualizacion: string;
  fo_categoria_cont: number;
  fo_estado_cont: number;
  fo_mod_inv: number;
  categoria_nombre?: string;
  estado_nombre?: string;
}
