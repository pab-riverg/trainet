// Contrato de GET /api/buscar/?q=<texto> (backend/busqueda). Cada grupo es un módulo visible para el rol del
// usuario; cada resultado lleva a la LISTA o pestaña del módulo (nunca a un detalle).

export interface ResultadoBusqueda {
  titulo: string;
  subtitulo: string;
  // Solo si el elemento tiene estado (por ejemplo "Abierto").
  estado?: string;
  // Ruta interna: módulo + vista opcional + q codificado (por ejemplo '/soporte?vista=gestion&q=impresora').
  ruta: string;
}

export interface GrupoBusqueda {
  // Clave del registro de módulos, o 'paginas' para el grupo de páginas.
  modulo: string;
  titulo: string;
  // Clase de Bootstrap Icons, por ejemplo 'bi-headset'.
  icono: string;
  ruta: string;
  resultados: ResultadoBusqueda[];
}

export interface RespuestaBusqueda {
  q: string;
  total: number;
  grupos: GrupoBusqueda[];
}
