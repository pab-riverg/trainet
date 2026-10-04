export const ESTADOS_TICKET: readonly { codigo: string; etiqueta: string }[] = [
  { codigo: 'abierto', etiqueta: 'Abierto' },
  { codigo: 'en_proceso', etiqueta: 'En proceso' },
  { codigo: 'resuelto', etiqueta: 'Resuelto' },
  { codigo: 'cerrado', etiqueta: 'Cerrado' }
];

export const PRIORIDADES_TICKET: readonly { codigo: string; etiqueta: string }[] = [
  { codigo: 'baja', etiqueta: 'Baja' },
  { codigo: 'media', etiqueta: 'Media' },
  { codigo: 'alta', etiqueta: 'Alta' },
  { codigo: 'urgente', etiqueta: 'Urgente' }
];

export function etiquetaEstado(codigo: string): string {
  return ESTADOS_TICKET.find(e => e.codigo === codigo)?.etiqueta ?? codigo;
}

export function etiquetaPrioridad(codigo: string): string {
  return PRIORIDADES_TICKET.find(p => p.codigo === codigo)?.etiqueta ?? codigo;
}

