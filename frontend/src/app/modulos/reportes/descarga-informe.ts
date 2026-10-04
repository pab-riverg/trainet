import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { ReportesService } from '../../servicios/reportes';
import { FormatoExportacion } from '../../modelos/reportes';
import { guardarBlob } from '../../utilidades/archivos';
import { mensajeError } from '../../utilidades/errores';
import { nombreDeContentDisposition } from '../../utilidades/reportes';

interface InformeDescargable {
  id: number;
  tipo_clave: string | null;
  fecha_generacion: string;
}

// Con responseType 'blob' el cuerpo de un error también llega como Blob: se lee para mostrar el mensaje real del API.
async function mensajeDeError(error: unknown): Promise<string> {
  const cuerpo = (error as { error?: unknown }).error;
  if (cuerpo instanceof Blob) {
    try {
      const json: unknown = JSON.parse(await cuerpo.text());
      const registro = (Array.isArray(json) ? { 0: json[0] } : json) as Record<string, unknown>;
      const valor = registro['detail'] ?? Object.values(registro)[0];
      const mensaje = Array.isArray(valor) ? valor[0] : valor;
      if (typeof mensaje === 'string') {
        return mensaje;
      }
    } catch {
      // El cuerpo no era JSON: se usa el mensaje por defecto.
    }
  }
  return mensajeError(error, 'No se pudo descargar el informe.');
}

/**
 * Descarga un informe en el formato pedido. Único punto de descarga de informes (detalle e historial).
 * Usa el mismo guardarBlob que la descarga de archivos importados. Emite al terminar de guardar el archivo
 * y, si algo falla, termina con un Error cuyo `message` es el texto real para mostrar al usuario.
 */
export function descargarInforme(
  reportes: ReportesService,
  informe: InformeDescargable,
  formato: FormatoExportacion
): Observable<void> {
  return reportes.exportarInforme(informe.id, formato).pipe(
    map(respuesta => {
      if (!respuesta.body || respuesta.body.size === 0) {
        throw new Error('El servidor devolvió un archivo vacío.');
      }
      // Si el navegador no expone Content-Disposition (CORS) se usa el mismo nombre que arma el API.
      const respaldo = `trainet-${informe.tipo_clave ?? 'informe'}-${informe.fecha_generacion.replace(/-/g, '')}.${formato}`;
      guardarBlob(respuesta.body, nombreDeContentDisposition(respuesta.headers.get('Content-Disposition'), respaldo));
    }),
    catchError(error => error instanceof Error
      ? throwError(() => error)
      : from(mensajeDeError(error)).pipe(switchMap(mensaje => throwError(() => new Error(mensaje)))))
  );
}
