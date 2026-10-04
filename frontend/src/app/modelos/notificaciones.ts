export interface Notificacion {
  id: number;
  mensaje: string;
  fecha: string;
  leida: boolean;
  // Ruta interna a la lista o pestaña del módulo notificado; vacía si no tiene destino.
  ruta: string;
  fo_usuario: number;
}
