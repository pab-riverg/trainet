interface Opcion {
  codigo: string;
  etiqueta: string;
}

// Las insignias siempre llevan el texto, nunca solo color.
export const ESTADOS_SOLICITUD_COMPRA: readonly Opcion[] = [
  { codigo: 'pendiente', etiqueta: 'Pendiente' },
  { codigo: 'aprobada', etiqueta: 'Aprobada' },
  { codigo: 'rechazada', etiqueta: 'Rechazada' },
  { codigo: 'comprada', etiqueta: 'Comprada' },
  { codigo: 'entregada', etiqueta: 'Entregada' },
  { codigo: 'en_revision', etiqueta: 'En revisión' },
  { codigo: 'recibida', etiqueta: 'Recibida' }
];

// Etiquetas más explicativas para el detalle, donde el siguiente paso importa.
const ETIQUETAS_LARGAS: Record<string, string> = {
  aprobada: 'Aprobada: en proceso de compra',
  comprada: 'Comprada: pendiente de entrega',
  entregada: 'Entregada: pendiente de confirmar',
  en_revision: 'En revisión: reclamo del solicitante'
};

export function etiquetaEstadoLarga(codigo: string): string {
  return ETIQUETAS_LARGAS[codigo] ?? etiquetaEstadoCompra(codigo);
}

// Tipos de evento de la bitácora de una solicitud, con su ícono de Bootstrap Icons.
export const EVENTOS_SOLICITUD: Record<string, { etiqueta: string; icono: string }> = {
  creada: { etiqueta: 'Solicitud creada', icono: 'bi-plus-circle' },
  aprobada: { etiqueta: 'Solicitud aprobada', icono: 'bi-check-circle' },
  rechazada: { etiqueta: 'Solicitud rechazada', icono: 'bi-x-circle' },
  comprada: { etiqueta: 'Compra confirmada', icono: 'bi-bag-check' },
  entregada: { etiqueta: 'Pedido entregado', icono: 'bi-truck' },
  recibida: { etiqueta: 'Recepción confirmada', icono: 'bi-patch-check' },
  no_recibida: { etiqueta: 'Reportado como no recibido', icono: 'bi-exclamation-triangle' },
  reentregada: { etiqueta: 'Pedido entregado nuevamente', icono: 'bi-arrow-repeat' },
  observacion: { etiqueta: 'Observación del encargado', icono: 'bi-chat-left-text' }
};

export function etiquetaEstadoCompra(codigo: string): string {
  return ESTADOS_SOLICITUD_COMPRA.find(e => e.codigo === codigo)?.etiqueta ?? codigo;
}

const formatoNumero = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 0,
  // En 'es' los números de 4 cifras no se agrupan por defecto; se fuerza el punto de miles.
  useGrouping: 'always'
} as unknown as Intl.NumberFormatOptions);

// Pesos colombianos sin decimales, por ejemplo $450.000
export function formatearPrecio(valor: number): string {
  return `$${formatoNumero.format(valor)}`;
}

// Íconos disponibles para las categorías (Bootstrap Icons).
export const ICONOS_CATEGORIA: readonly { clase: string; etiqueta: string }[] = [
  { clase: 'bi-key', etiqueta: 'Licencias' },
  { clase: 'bi-laptop', etiqueta: 'Equipos' },
  { clase: 'bi-paperclip', etiqueta: 'Oficina' },
  { clase: 'bi-house-door', etiqueta: 'Mobiliario' },
  { clase: 'bi-book', etiqueta: 'Formación' },
  { clase: 'bi-tools', etiqueta: 'Servicios' },
  { clase: 'bi-box-seam', etiqueta: 'Otros' },
  { clase: 'bi-printer', etiqueta: 'Impresión' },
  { clase: 'bi-phone', etiqueta: 'Telefonía' },
  { clase: 'bi-headset', etiqueta: 'Audio' },
  { clase: 'bi-camera-video', etiqueta: 'Video' },
  { clase: 'bi-cup-hot', etiqueta: 'Cafetería' },
  { clase: 'bi-brush', etiqueta: 'Aseo' },
  { clase: 'bi-lightning-charge', etiqueta: 'Energía' },
  { clase: 'bi-wifi', etiqueta: 'Redes' },
  { clase: 'bi-shield-check', etiqueta: 'Seguridad' }
];
