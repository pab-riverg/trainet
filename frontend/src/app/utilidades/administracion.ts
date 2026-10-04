import { ClaveRequisito } from '../modelos/administracion';

export const MAX_NOMBRE_EQUIPO = 60;

const formatoFecha = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatoFechaHora = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
});
const formatoNumero = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 2,
  // En 'es' los números de 4 cifras no se agrupan por defecto; se fuerza el punto de miles.
  useGrouping: 'always'
} as unknown as Intl.NumberFormatOptions);

export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) {
    return '';
  }
  const fecha = new Date(iso);
  return isNaN(fecha.getTime()) ? '' : formatoFechaHora.format(fecha);
}

// 'AAAA-MM-DD' como fecha local (sin el desfase de zona horaria de new Date(texto)).
export function formatearFechaIso(iso: string | null | undefined): string {
  if (!iso) {
    return '—';
  }
  const [anio, mes, dia] = iso.slice(0, 10).split('-').map(Number);
  return formatoFecha.format(new Date(anio, mes - 1, dia));
}

export function formatearNumero(valor: string | number | null | undefined): string {
  if (valor === null || valor === undefined) {
    return '';
  }
  return typeof valor === 'number' ? formatoNumero.format(valor) : valor;
}

// Módulo que gestiona cada requisito del panel y su ruta. El API no manda rutas: se deciden aquí por clave.
export const DESTINO_REQUISITO: Record<ClaveRequisito, { modulo: string; ruta: string; icono: string }> = {
  empleados: { modulo: 'Usuarios', ruta: '/usuarios', icono: 'bi-people' },
  capacitacion: { modulo: 'Capacitación', ruta: '/capacitacion', icono: 'bi-mortarboard' },
  documentos: { modulo: 'Documentos', ruta: '/documentos', icono: 'bi-folder2-open' },
  reportes: { modulo: 'Reportes', ruta: '/reportes', icono: 'bi-bar-chart' }
};
