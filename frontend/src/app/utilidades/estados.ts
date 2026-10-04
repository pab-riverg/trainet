/** Variante semántica de una insignia de estado. El color nunca va solo: la insignia siempre lleva texto. */
export type VarianteEstado = 'exito' | 'aviso' | 'peligro' | 'info' | 'neutro';

/** Dominios con su propio mapa de estados. 'general' junta todos (tarjetas de Inicio, buscador). */
export type DominioEstado =
  | 'usuario' | 'ticket' | 'prioridad' | 'compra' | 'recurso' | 'curso' | 'capacitacion' | 'proveedor' | 'cotizacion'
  | 'acuerdo' | 'informe' | 'catalogo' | 'bitacora' | 'asistente' | 'general';

type MapaEstados = Readonly<Record<string, VarianteEstado>>;

// Las claves están normalizadas (ver claveEstado): minúsculas, sin tildes y con '_' en lugar de espacios,
// así valen igual el código del API ('en_proceso') y el texto ('En proceso').
const USUARIO: MapaEstados = { activo: 'exito', inactivo: 'neutro' };

const TICKET: MapaEstados = { abierto: 'info', en_proceso: 'aviso', resuelto: 'exito', cerrado: 'neutro' };

// Prioridades de tickets y de pedidos de recursos.
const PRIORIDAD: MapaEstados = { baja: 'neutro', media: 'info', alta: 'aviso', urgente: 'peligro' };

const COMPRA: MapaEstados = {
  pendiente: 'aviso', aprobada: 'info', rechazada: 'peligro', comprada: 'info', entregada: 'info',
  en_revision: 'aviso', recibida: 'exito'
};

const RECURSO: MapaEstados = { pendiente: 'aviso', aprobado: 'info', rechazado: 'peligro', entregado: 'exito' };

// Estado de un curso.
const CURSO: MapaEstados = { planificado: 'info', en_curso: 'aviso', finalizado: 'exito' };

// Participación en capacitaciones (asistió: Sí / No).
const CAPACITACION: MapaEstados = { si: 'exito', no: 'neutro' };

const PROVEEDOR: MapaEstados = { sin_contratar: 'neutro', contratado: 'exito', inactivo: 'neutro' };

const COTIZACION: MapaEstados = { pendiente: 'aviso', aprobada: 'exito', rechazada: 'peligro' };

// Acuerdos (contratos) con proveedores.
const ACUERDO: MapaEstados = {
  pendiente_de_aprobacion: 'aviso', pendiente_aprobacion: 'aviso', vigente: 'exito', finalizado: 'neutro',
  cancelado: 'neutro', rechazado: 'peligro'
};

// Informes y archivos importados (estado y formato).
const INFORME: MapaEstados = { activo: 'exito', archivado: 'neutro', csv: 'info', xlsx: 'info' };

// Etiquetas sueltas de catálogos y listados.
const CATALOGO: MapaEstados = {
  disponible: 'exito', no_disponible: 'neutro', elegida: 'exito', actualizado: 'info', activa: 'exito',
  inactiva: 'neutro', inactivo: 'neutro', activo: 'exito'
};

// Acciones de la bitácora de auditoría (código del API o etiqueta): fallos y borrados llaman la atención.
const BITACORA: MapaEstados = {
  login_fallido: 'aviso', inicio_de_sesion_fallido: 'aviso',
  usuario_eliminado: 'peligro', archivo_eliminado: 'peligro', informe_eliminado: 'peligro',
  usuario_creado: 'exito', archivo_importado: 'exito', informe_generado: 'exito', informe_consolidado: 'exito'
};

// Valoraciones y respuestas del asistente virtual.
const ASISTENTE: MapaEstados = {
  resuelta: 'exito', sin_resolver: 'aviso', util: 'exito', no_util: 'peligro', sin_valorar: 'neutro',
  sin_respuesta: 'aviso', pendiente: 'neutro', valorada_util: 'exito', valorada_no_util: 'peligro'
};

const MAPAS: Readonly<Record<Exclude<DominioEstado, 'general'>, MapaEstados>> = {
  usuario: USUARIO, ticket: TICKET, prioridad: PRIORIDAD, compra: COMPRA, recurso: RECURSO,
  curso: CURSO, capacitacion: CAPACITACION, proveedor: PROVEEDOR, cotizacion: COTIZACION, acuerdo: ACUERDO,
  informe: INFORME, catalogo: CATALOGO, bitacora: BITACORA, asistente: ASISTENTE
};

// Orden de preferencia cuando el dominio es 'general' y un valor existe en varios mapas.
const ORDEN_GENERAL: readonly Exclude<DominioEstado, 'general'>[] = [
  'ticket', 'compra', 'recurso', 'curso', 'acuerdo', 'cotizacion', 'proveedor', 'capacitacion', 'usuario', 'informe',
  'catalogo', 'asistente', 'prioridad', 'bitacora'
];

/** Clave de búsqueda: sin espacios sobrantes, minúsculas, sin tildes y con '_' ('En revisión' -> 'en_revision'). */
export function claveEstado(valor: string | null | undefined): string {
  return (valor ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[\s-]+/g, '_');
}

/** Variante de un estado en un dominio; un valor desconocido es 'neutro'. */
export function varianteEstado(dominio: DominioEstado, valor: string | null | undefined): VarianteEstado {
  const clave = claveEstado(valor);
  if (dominio === 'general') {
    for (const candidato of ORDEN_GENERAL) {
      const variante = MAPAS[candidato][clave];
      if (variante) {
        return variante;
      }
    }
    return 'neutro';
  }
  return MAPAS[dominio][clave] ?? 'neutro';
}

/** Texto a mostrar: sin espacios sobrantes y con la primera letra en mayúscula ('en proceso' -> 'En proceso'). */
export function textoEstado(valor: string | null | undefined): string {
  const texto = (valor ?? '').trim();
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
