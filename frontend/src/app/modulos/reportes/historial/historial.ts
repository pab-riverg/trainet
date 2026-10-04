import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { sincronizarBusquedaConQ } from '../../../utilidades/rutas';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, finalize } from 'rxjs';
import { ReportesService } from '../../../servicios/reportes';
import { FormatoExportacion, InformeLista, TipoReporte } from '../../../modelos/reportes';
import { ETIQUETA_FORMATO, FORMATOS_EXPORTACION, formatearFecha } from '../../../utilidades/reportes';
import { descargarInforme } from '../descarga-informe';
import { mensajeError } from '../../../utilidades/errores';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { MenuDescarga, OpcionDescarga } from '../../../compartidos/menu-descarga/menu-descarga';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

@Component({
  selector: 'app-historial-informes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion, EstadoBadge, MenuDescarga, Paginador],
  templateUrl: './historial.html',
})
export class HistorialInformes implements OnInit {

  private reportes = inject(ReportesService);

  // Solo el administrador puede eliminar informes.
  puedeEliminar = input(false);
  ver = output<number>();

  formatos = FORMATOS_EXPORTACION;
  etiquetaFormato = ETIQUETA_FORMATO;
  formatearFecha = formatearFecha;

  informes = signal<InformeLista[]>([]);
  tipos = signal<TipoReporte[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  paginacion = crearPaginacion(() => this.informes());

  // Opciones del menú de descarga de cada fila (un solo botón por informe).
  opcionesPorInforme = computed(() => new Map<number, OpcionDescarga[]>(
    this.paginacion.visibles().map(informe => [informe.id, this.formatos.map(formato => ({
      etiqueta: this.etiquetaFormato[formato],
      accion: () => this.descargar(informe, formato)
    }))])
  ));

  filtrosForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    tipo: new FormControl<number | null>(null),
    desde: new FormControl('', { nonNullable: true }),
    hasta: new FormControl('', { nonNullable: true })
  });

  informePorEliminar = signal<number | null>(null);
  eliminandoId = signal<number | null>(null);
  // Descarga en curso: "<id>-<formato>".
  descargando = signal<string | null>(null);
  errorAccion = signal<string | null>(null);

  constructor() {
    // Precarga el filtro con ?q= (búsqueda global) antes de la primera carga de la lista.
    sincronizarBusquedaConQ(this.filtrosForm.controls.search);
    this.filtrosForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.cargar());
    // La página vuelve a la primera en cuanto cambia un filtro (la recarga espera la pausa de escritura).
    this.filtrosForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
  }

  ngOnInit(): void {
    this.cargar();

    // Tipos con informes: los de sistema con clave, incluido el consolidado.
    this.reportes.listarTipos().subscribe({
      next: tipos => this.tipos.set(tipos.filter(tipo => tipo.origen === 'sistema' && tipo.clave !== null)),
      error: () => this.tipos.set([])
    });
  }

  cargar(): void {
    const valores = this.filtrosForm.getRawValue();
    this.cargando.set(true);
    this.error.set(null);

    this.reportes.listarInformes({
      search: valores.search.trim() || undefined,
      tipo: valores.tipo ?? undefined,
      desde: valores.desde || undefined,
      hasta: valores.hasta || undefined
    }).subscribe({
      next: informes => {
        this.informes.set(informes);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudo cargar el historial de informes.'));
        this.cargando.set(false);
      }
    });
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ search: '', tipo: null, desde: '', hasta: '' });
  }

  descargar(informe: InformeLista, formato: FormatoExportacion): void {
    if (this.descargando()) {
      return;
    }
    this.descargando.set(`${informe.id}-${formato}`);
    this.errorAccion.set(null);

    descargarInforme(this.reportes, informe, formato)
      .pipe(finalize(() => this.descargando.set(null)))
      .subscribe({ error: (error: Error) => this.errorAccion.set(error.message) });
  }

  // True mientras se descarga alguno de los formatos de ese informe.
  descargaDe(id: number): boolean {
    return this.descargando()?.startsWith(`${id}-`) ?? false;
  }

  pedirEliminar(informe: InformeLista): void {
    this.informePorEliminar.set(informe.id);
    this.errorAccion.set(null);
  }

  cancelarEliminar(): void {
    this.informePorEliminar.set(null);
  }

  confirmarEliminar(informe: InformeLista): void {
    this.eliminandoId.set(informe.id);
    this.errorAccion.set(null);

    this.reportes.eliminarInforme(informe.id).subscribe({
      next: () => {
        this.eliminandoId.set(null);
        this.informePorEliminar.set(null);
        this.cargar();
      },
      error: error => {
        this.eliminandoId.set(null);
        this.informePorEliminar.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo eliminar el informe.'));
      }
    });
  }

}
