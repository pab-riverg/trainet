import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ReportesService } from '../../../servicios/reportes';
import { FormatoExportacion, InformeDetalle } from '../../../modelos/reportes';
import { ETIQUETA_FORMATO, FORMATOS_EXPORTACION, formatearFecha, formatearFechaHora } from '../../../utilidades/reportes';
import { mensajeError } from '../../../utilidades/errores';
import { descargarInforme } from '../descarga-informe';
import { ContenidoInforme } from '../../../compartidos/contenido-informe/contenido-informe';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { MenuDescarga, OpcionDescarga } from '../../../compartidos/menu-descarga/menu-descarga';

// Vista reutilizable de un informe (tras generarlo o desde el historial). Todo el texto se muestra
// con interpolación (escapado): los títulos y celdas pueden provenir de archivos subidos por usuarios.
@Component({
  selector: 'app-detalle-informe',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContenidoInforme, EstadoBadge, MenuDescarga],
  templateUrl: './detalle-informe.html',
  styleUrl: './detalle-informe.css',
})
export class DetalleInforme {

  private reportes = inject(ReportesService);

  informeId = input.required<number>();
  cerrar = output<void>();

  formatearFecha = formatearFecha;
  formatearFechaHora = formatearFechaHora;

  // Un solo botón con un menú de formatos; cada opción usa la descarga de siempre.
  opcionesDescarga: OpcionDescarga[] = FORMATOS_EXPORTACION.map(formato => ({
    etiqueta: ETIQUETA_FORMATO[formato],
    accion: () => this.descargar(formato)
  }));

  informe = signal<InformeDetalle | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  descargando = signal<FormatoExportacion | null>(null);
  errorDescarga = signal<string | null>(null);

  constructor() {
    effect(() => {
      this.cargar(this.informeId());
    });
  }

  private cargar(id: number): void {
    this.cargando.set(true);
    this.error.set(null);
    this.errorDescarga.set(null);
    this.informe.set(null);

    this.reportes.obtenerInforme(id).subscribe({
      next: informe => {
        this.informe.set(informe);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudo cargar el informe.'));
        this.cargando.set(false);
      }
    });
  }

  descargar(formato: FormatoExportacion): void {
    const informe = this.informe();
    if (!informe || this.descargando()) {
      return;
    }
    this.descargando.set(formato);
    this.errorDescarga.set(null);

    descargarInforme(this.reportes, informe, formato)
      .pipe(finalize(() => this.descargando.set(null)))
      .subscribe({ error: (error: Error) => this.errorDescarga.set(error.message) });
  }

}
