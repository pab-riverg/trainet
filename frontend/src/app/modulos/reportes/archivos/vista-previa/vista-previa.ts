import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { ReportesService } from '../../../../servicios/reportes';
import { ArchivoImportado, VistaPreviaArchivo } from '../../../../modelos/reportes';
import { formatearNumero } from '../../../../utilidades/reportes';
import { mensajeError } from '../../../../utilidades/errores';

export const ID_MODAL_VISTA_PREVIA = 'modalVistaPreviaArchivo';

export interface SolicitudVistaPrevia {
  archivo: ArchivoImportado;
  n: number;
}

// Modal con los encabezados y las primeras 20 filas de un archivo importado.
@Component({
  selector: 'app-vista-previa-archivo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vista-previa.html',
})
export class VistaPreviaArchivoModal {

  private reportes = inject(ReportesService);

  solicitud = input<SolicitudVistaPrevia | null>(null);

  readonly idModal = ID_MODAL_VISTA_PREVIA;
  formatearNumero = formatearNumero;

  archivo = signal<ArchivoImportado | null>(null);
  datos = signal<VistaPreviaArchivo | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const solicitud = this.solicitud();
      if (solicitud) {
        untracked(() => this.cargar(solicitud.archivo));
      }
    });
  }

  private cargar(archivo: ArchivoImportado): void {
    this.archivo.set(archivo);
    this.datos.set(null);
    this.error.set(null);
    this.cargando.set(true);

    this.reportes.vistaPrevia(archivo.id).subscribe({
      next: datos => {
        this.datos.set(datos);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudo cargar la vista previa.'));
        this.cargando.set(false);
      }
    });
  }

}
