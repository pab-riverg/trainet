// Contrato de GET /api/inicio/ (backend/inicio). Las tarjetas son una unión discriminada por `tipo`:
// el frontend las pinta según su tipo, sin lógica de roles.

export interface UsuarioInicio {
  nombre: string;
  rol: string;
  rol_nombre: string;
}

export type SeccionMenu = 'principal' | 'gestion' | 'mas' | 'sistema';

// Módulo visible para el rol del usuario; el menú lateral se construye con estos datos.
export interface ModuloMenu {
  clave: string;
  titulo: string;
  // Ruta del frontend, por ejemplo '/compras'.
  ruta: string;
  // Clase de Bootstrap Icons, por ejemplo 'bi-bag'.
  icono: string;
  seccion: SeccionMenu;
}

interface TarjetaBase {
  clave: string;
  titulo: string;
  ruta_ver_todo?: string;
}

export interface Metrica {
  etiqueta: string;
  valor: string | number;
  // Si existe, la métrica es un enlace.
  ruta?: string;
}

export interface TarjetaMetricas extends TarjetaBase {
  tipo: 'metricas';
  metricas: Metrica[];
}

export interface ItemLista {
  titulo: string;
  subtitulo: string;
  estado: string;
  ruta: string;
}

export interface TarjetaLista extends TarjetaBase {
  tipo: 'lista';
  // Máximo 5 elementos.
  items: ItemLista[];
  // Cantidad real de elementos (puede ser mayor que items.length).
  total: number;
}

export interface ItemProgreso {
  titulo: string;
  subtitulo: string;
  // De 0 a 100.
  porcentaje: number;
  estado: string;
}

export interface TarjetaProgreso extends TarjetaBase {
  tipo: 'progreso';
  item: ItemProgreso;
}

// Sin datos: el frontend pinta el cuadro "¿En qué piensas hoy?".
export interface TarjetaAccesoTriny extends TarjetaBase {
  tipo: 'acceso_triny';
}

export type TarjetaInicio = TarjetaMetricas | TarjetaLista | TarjetaProgreso | TarjetaAccesoTriny;

export interface RespuestaInicio {
  usuario: UsuarioInicio;
  nombre_equipo: string;
  modulos: ModuloMenu[];
  tarjetas: TarjetaInicio[];
}
