// Contrato de GET /api/dashboard/: es el mismo `contenido` de los informes (indicadores, secciones y gráficos),
// por eso se reutilizan los tipos de modelos/reportes.ts en lugar de duplicarlos.
import type { ContenidoInforme } from './reportes';

export type ContenidoDashboard = ContenidoInforme;

// Periodo opcional (AAAA-MM-DD, inclusivo, máximo 366 días). Sin fechas, el API usa los últimos 30 días.
export interface FiltrosDashboard {
  desde?: string;
  hasta?: string;
}
