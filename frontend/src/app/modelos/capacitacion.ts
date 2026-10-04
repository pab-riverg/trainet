export interface ModuloCapacitacion {
  id: number;
  participantes_activos: number;
  fo_sistema: number;
}

export interface CategoriaCurso {
  id: number;
  nombre_categoria: string;
}

export interface Curso {
  id: number;
  titulo: string;
  descripcion: string;
  duracion: number;
  fecha_creacion: string;
  estado: string;
  video_url: string | null;
  fo_categoria_curso: number;
  fo_mod_cap: number;
  categoria_nombre?: string;
}

export interface Capacitador {
  id: number;
  fo_usuario: number;
  fo_usuario_nombre?: string;
  especialidad_tecnica: string;
  experiencia: number;
}

export interface Empleado {
  id: number;
  fo_usuario: number;
  fo_usuario_nombre?: string;
  puesto: string;
  fecha_ingreso: string;
  fo_supervisor: number;
}

export interface Capacitacion {
  id: number;
  fecha_inicio: string;
  fecha_fin: string;
  modalidad: string;
  fo_instructor: number;
  fo_mod_cap: number;
  fo_curso: number;
  curso_titulo?: string;
  instructor_nombre?: string;
}

export interface ParticipanteCapacitacion {
  id: number;
  asistio: boolean;
  fo_capacitacion: number;
  fo_empleado: number;
  empleado_nombre?: string;
  curso_titulo?: string;
  fecha_inicio?: string;
}

export interface MaterialEducativo {
  id: number;
  titulo: string;
  archivo: string;
  fecha_subida: string;
  fo_curso: number;
}

export interface EvidenciaParticipacion {
  id: number;
  archivo: string;
  fecha_subida: string;
  fo_participante: number;
}

export interface ProgresoCurso {
  id: number;
  porcentaje: number;
  fo_empleado: number;
  fo_curso: number;
  curso_titulo?: string;
}

export type CursoCrear = Omit<Curso, 'id' | 'fecha_creacion' | 'categoria_nombre'>;

export type CapacitacionCrear = Omit<Capacitacion, 'id' | 'curso_titulo' | 'instructor_nombre'>;

export interface OpcionEstadoCurso {
  codigo: string;
  etiqueta: string;
}

export const ESTADOS_CURSO: OpcionEstadoCurso[] = [
  { codigo: 'planificado', etiqueta: 'Planificado' },
  { codigo: 'en_curso', etiqueta: 'En curso' },
  { codigo: 'finalizado', etiqueta: 'Finalizado' }
];

export interface OpcionModalidad {
  codigo: string;
  etiqueta: string;
}

export const MODALIDADES: OpcionModalidad[] = [
  { codigo: 'presencial', etiqueta: 'Presencial' },
  { codigo: 'virtual', etiqueta: 'Virtual' },
  { codigo: 'mixta', etiqueta: 'Mixta' }
];
