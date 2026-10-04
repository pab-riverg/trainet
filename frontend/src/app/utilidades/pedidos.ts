export const ESTADOS_SOLICITUD: readonly { codigo: string; etiqueta: string }[] = [
  { codigo: 'pendiente', etiqueta: 'Pendiente' },
  { codigo: 'aprobado', etiqueta: 'Aprobado' },
  { codigo: 'rechazado', etiqueta: 'Rechazado' },
  { codigo: 'entregado', etiqueta: 'Entregado' }
];

export const PRIORIDADES_SOLICITUD: readonly { codigo: string; etiqueta: string }[] = [
  { codigo: 'alta', etiqueta: 'Alta' },
  { codigo: 'media', etiqueta: 'Media' },
  { codigo: 'baja', etiqueta: 'Baja' }
];

export function etiquetaEstadoSolicitud(codigo: string): string {
  return ESTADOS_SOLICITUD.find(e => e.codigo === codigo)?.etiqueta ?? codigo;
}

export function etiquetaPrioridadSolicitud(codigo: string): string {
  return PRIORIDADES_SOLICITUD.find(p => p.codigo === codigo)?.etiqueta ?? codigo;
}

