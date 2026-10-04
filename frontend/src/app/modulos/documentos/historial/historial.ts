import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { catchError, of, startWith, switchMap, tap } from 'rxjs';
import { DocumentosService } from '../../../servicios/documentos';
import { Documento, HistorialAccesoDocumento } from '../../../modelos/documentos';
import { mensajeError } from '../../../utilidades/errores';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

@Component({
  selector: 'app-historial-documentos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Paginador],
  templateUrl: './historial.html',
  styleUrl: './historial.css',
})
export class HistorialDocumentos implements OnInit {

  private documentosService = inject(DocumentosService);

  registros = signal<HistorialAccesoDocumento[]>([]);
  paginacion = crearPaginacion(() => this.registros());
  cargando = signal(false);
  error = signal<string | null>(null);

  documentos = signal<Documento[]>([]);
  errorDocumentos = signal<string | null>(null);

  filtrosForm = new FormGroup({
    accion: new FormControl<string | null>(null),
    documento: new FormControl<number | null>(null)
  });

  constructor() {
    // Cambiar un filtro o la selección vuelve a la primera página.
    this.filtrosForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
    this.filtrosForm.valueChanges
      .pipe(
        startWith(null),
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() => {
          const { accion, documento } = this.filtrosForm.getRawValue();
          return this.documentosService.listarHistorial({
            accion: accion ?? undefined,
            fo_documento: documento ?? undefined
          }).pipe(
            catchError(error => {
              this.error.set(mensajeError(error, 'No se pudo cargar el historial de accesos.'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: registros => {
          if (registros) {
            this.registros.set(registros);
          }
          this.cargando.set(false);
        },
        error: error => {
          this.error.set(mensajeError(error, 'No se pudo cargar el historial de accesos.'));
          this.cargando.set(false);
        }
      });
  }

  ngOnInit(): void {
    this.documentosService.listarDocumentos().subscribe({
      next: documentos => this.documentos.set(documentos),
      error: error => this.errorDocumentos.set(mensajeError(error, 'No se pudo cargar la lista de documentos.'))
    });
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ accion: null, documento: null });
  }

  etiquetaAccion(accion: string): string {
    return accion === 'descarga' ? 'Descarga' : 'Consulta';
  }

}
