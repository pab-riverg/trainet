import { HttpErrorResponse } from '@angular/common/http';

export function mensajeError(error: unknown, porDefecto: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return porDefecto;
  }

  if (error.status === 403) {
    return 'No tienes permiso para realizar esta acción.';
  }

  const cuerpo: unknown = error.error;

  if (Array.isArray(cuerpo) && typeof cuerpo[0] === 'string') {
    return cuerpo[0];
  }

  if (cuerpo && typeof cuerpo === 'object') {
    const registro = cuerpo as Record<string, unknown>;

    if (typeof registro['detail'] === 'string') {
      return registro['detail'];
    }

    const mensajesPorCampo: string[] = [];
    for (const [campo, valor] of Object.entries(registro)) {
      if (Array.isArray(valor) && typeof valor[0] === 'string') {
        mensajesPorCampo.push(`${campo}: ${valor[0]}`);
      } else if (typeof valor === 'string') {
        mensajesPorCampo.push(`${campo}: ${valor}`);
      }
    }

    if (mensajesPorCampo.length > 0) {
      return mensajesPorCampo.join(' | ');
    }
  }

  return porDefecto;
}
