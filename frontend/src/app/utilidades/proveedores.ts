interface Opcion {
  codigo: string;
  etiqueta: string;
}

// Las insignias siempre llevan el texto, nunca solo color.
export const ESTADOS_PROVEEDOR: readonly Opcion[] = [
  { codigo: 'sin_contratar', etiqueta: 'Sin contratar' },
  { codigo: 'contratado', etiqueta: 'Contratado' },
  { codigo: 'inactivo', etiqueta: 'Inactivo' }
];

export const ESTADOS_COTIZACION: readonly Opcion[] = [
  { codigo: 'pendiente', etiqueta: 'Pendiente' },
  { codigo: 'aprobada', etiqueta: 'Aprobada' },
  { codigo: 'rechazada', etiqueta: 'Rechazada' }
];

export const ESTADOS_CONTRATO: readonly Opcion[] = [
  { codigo: 'pendiente_aprobacion', etiqueta: 'Pendiente de aprobación' },
  { codigo: 'vigente', etiqueta: 'Vigente' },
  { codigo: 'finalizado', etiqueta: 'Finalizado' },
  { codigo: 'cancelado', etiqueta: 'Cancelado' },
  { codigo: 'rechazado', etiqueta: 'Rechazado' }
];

function etiqueta(opciones: readonly Opcion[], codigo: string): string {
  return opciones.find(o => o.codigo === codigo)?.etiqueta ?? codigo;
}

export const etiquetaEstadoProveedor = (codigo: string) => etiqueta(ESTADOS_PROVEEDOR, codigo);

export const etiquetaEstadoCotizacion = (codigo: string) => etiqueta(ESTADOS_COTIZACION, codigo);

export const etiquetaEstadoContrato = (codigo: string) => etiqueta(ESTADOS_CONTRATO, codigo);
