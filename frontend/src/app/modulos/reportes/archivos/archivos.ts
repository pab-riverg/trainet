import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { sincronizarBusquedaConQ } from '../../../utilidades/rutas';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, Subject, catchError, debounceTime, merge, switchMap, tap } from 'rxjs';
import { ReportesService } from '../../../servicios/reportes';
import { ArchivoImportado, Carpeta, FiltrosArchivos, TipoReporte } from '../../../modelos/reportes';
import {
  MAX_ARCHIVOS_CONSOLIDADO, MIN_ARCHIVOS_CONSOLIDADO, erroresPorCampo, formatearFecha, formatearNumero
} from '../../../utilidades/reportes';
import { guardarBlob } from '../../../utilidades/archivos';
import { mensajeError } from '../../../utilidades/errores';
import { cerrarModal } from '../../../utilidades/modal';
import { ArchivoFormulario, ID_MODAL_ARCHIVO, SolicitudFormulario } from './archivo-formulario/archivo-formulario';
import { ID_MODAL_VISTA_PREVIA, SolicitudVistaPrevia, VistaPreviaArchivoModal } from './vista-previa/vista-previa';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

const ID_MODAL_CONSOLIDAR = 'modalConsolidar';

interface CarpetaActiva {
  anio: number;
  mes: number;
  tipo_id: number;
}

interface GrupoAnio {
  anio: number;
  meses: { mes: number; nombre: string; carpetas: Carpeta[] }[];
}

@Component({
  selector: 'app-archivos-importados',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ArchivoFormulario, VistaPreviaArchivoModal, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './archivos.html',
  styleUrl: './archivos.css',
})
export class ArchivosImportados implements OnInit {

  private reportes = inject(ReportesService);

  // Quien importa (administrador y roles con permiso de importar) gestiona sus archivos; el directivo solo
  // consulta, previsualiza, descarga y consolida. El backend ya limita la lista a los archivos del usuario.
  puedeImportar = input(false);
  informeGenerado = output<number>();

  readonly idModalArchivo = ID_MODAL_ARCHIVO;
  readonly idModalVistaPrevia = ID_MODAL_VISTA_PREVIA;
  readonly idModalConsolidar = ID_MODAL_CONSOLIDAR;
  readonly minArchivos = MIN_ARCHIVOS_CONSOLIDADO;
  readonly maxArchivos = MAX_ARCHIVOS_CONSOLIDADO;
  formatearFecha = formatearFecha;
  formatearNumero = formatearNumero;

  archivos = signal<ArchivoImportado[]>([]);
  paginacion = crearPaginacion(() => this.archivos());
  tipos = signal<TipoReporte[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  // --- Carpetas virtuales ---
  carpetas = signal<Carpeta[]>([]);
  totalGeneral = signal(0);
  errorCarpetas = signal<string | null>(null);
  carpetaActiva = signal<CarpetaActiva | null>(null);

  grupos = computed<GrupoAnio[]>(() => {
    const resultado: GrupoAnio[] = [];
    for (const carpeta of this.carpetas()) {
      let grupo = resultado.find(g => g.anio === carpeta.anio);
      if (!grupo) {
        grupo = { anio: carpeta.anio, meses: [] };
        resultado.push(grupo);
      }
      let mes = grupo.meses.find(m => m.mes === carpeta.mes);
      if (!mes) {
        mes = { mes: carpeta.mes, nombre: carpeta.mes_nombre, carpetas: [] };
        grupo.meses.push(mes);
      }
      mes.carpetas.push(carpeta);
    }
    return resultado;
  });

  filtrosForm = new FormGroup({
    search: new FormControl('', { nonNullable: true }),
    tipo: new FormControl<number | null>(null),
    archivados: new FormControl(false, { nonNullable: true })
  });

  // --- Selección para consolidar ---
  seleccion = signal<ReadonlySet<number>>(new Set());
  mensajeSeleccion = computed(() => {
    const n = this.seleccion().size;
    if (n < MIN_ARCHIVOS_CONSOLIDADO) {
      return `Selecciona al menos ${MIN_ARCHIVOS_CONSOLIDADO} archivos para consolidar.`;
    }
    if (n > MAX_ARCHIVOS_CONSOLIDADO) {
      return `Puedes consolidar como máximo ${MAX_ARCHIVOS_CONSOLIDADO} archivos; quita ${n - MAX_ARCHIVOS_CONSOLIDADO}.`;
    }
    return null;
  });
  consolidarForm = new FormGroup({ titulo: new FormControl('', { nonNullable: true }) });
  consolidando = signal(false);
  errorConsolidar = signal<string | null>(null);

  // --- Modales y acciones ---
  solicitudFormulario = signal<SolicitudFormulario | null>(null);
  solicitudVistaPrevia = signal<SolicitudVistaPrevia | null>(null);
  private contador = 0;

  archivoPorEliminar = signal<number | null>(null);
  accionEnCurso = signal<number | null>(null);
  errorAccion = signal<string | null>(null);

  tiposArchivo = computed(() => this.tipos().filter(tipo => tipo.origen === 'archivo'));

  // Cada recarga cancela la anterior (switchMap): una respuesta lenta no puede pisar a la más reciente.
  private recarga$ = new Subject<void>();

  constructor() {
    // Cambiar un filtro o la selección vuelve a la primera página.
    this.filtrosForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
    // Precarga el filtro con ?q= (búsqueda global) antes de la primera carga de la lista.
    sincronizarBusquedaConQ(this.filtrosForm.controls.search);
    this.recarga$
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() => this.reportes.listarArchivos(this.filtrosActuales()).pipe(
          catchError(error => {
            this.error.set(mensajeError(error, 'No se pudo cargar la lista de archivos.'));
            this.cargando.set(false);
            return EMPTY;
          })
        )),
        takeUntilDestroyed()
      )
      .subscribe(archivos => {
        this.archivos.set(archivos);
        this.cargando.set(false);
      });

    const controles = this.filtrosForm.controls;
    merge(
      controles.search.valueChanges.pipe(debounceTime(300)),
      controles.tipo.valueChanges,
      controles.archivados.valueChanges.pipe(tap(archivados => this.alCambiarArchivados(archivados)))
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.cargarArchivos());
  }

  // Filtros del API a partir del formulario y de la carpeta elegida.
  private filtrosActuales(): FiltrosArchivos {
    const valores = this.filtrosForm.getRawValue();
    const carpeta = this.carpetaActiva();
    return {
      search: valores.search.trim() || undefined,
      tipo: valores.tipo ?? carpeta?.tipo_id,
      anio: carpeta?.anio,
      mes: carpeta?.mes,
      // Activados: solo los archivados; desactivados: sin parámetro (el API devuelve los activos).
      activo: valores.archivados ? false : undefined
    };
  }

  // Al alternar el interruptor: se vacía la selección (cambia el conjunto visible) y, como las carpetas
  // agrupan solo archivos activos, se quita el filtro de carpeta que ya no corresponde.
  private alCambiarArchivados(archivados: boolean): void {
    this.limpiarSeleccion();
    if (archivados) {
      this.carpetaActiva.set(null);
    }
  }

  ngOnInit(): void {
    this.cargarArchivos();
    this.cargarCarpetas();

    this.reportes.listarTipos('archivo').subscribe({
      next: tipos => this.tipos.set(tipos),
      error: error => this.error.set(mensajeError(error, 'No se pudieron cargar los tipos de archivo.'))
    });
  }

  cargarArchivos(): void {
    this.recarga$.next();
  }

  cargarCarpetas(): void {
    this.reportes.listarCarpetas().subscribe({
      next: respuesta => {
        this.carpetas.set(respuesta.carpetas);
        this.totalGeneral.set(respuesta.total_general);
        this.errorCarpetas.set(null);
      },
      error: error => this.errorCarpetas.set(mensajeError(error, 'No se pudieron cargar las carpetas.'))
    });
  }

  private recargar(): void {
    this.cargarArchivos();
    this.cargarCarpetas();
  }

  // --- Carpetas ---

  esCarpetaActiva(carpeta: Carpeta): boolean {
    const activa = this.carpetaActiva();
    return !!activa && activa.anio === carpeta.anio && activa.mes === carpeta.mes && activa.tipo_id === carpeta.tipo_id;
  }

  elegirCarpeta(carpeta: Carpeta): void {
    this.carpetaActiva.set({ anio: carpeta.anio, mes: carpeta.mes, tipo_id: carpeta.tipo_id });
    // La carpeta ya define el tipo: se limpia el filtro de tipo para no contradecirla.
    this.filtrosForm.controls.tipo.setValue(null, { emitEvent: false });
    this.cargarArchivos();
  }

  verTodo(): void {
    this.carpetaActiva.set(null);
    this.cargarArchivos();
  }

  // --- Selección ---

  estaSeleccionado(id: number): boolean {
    return this.seleccion().has(id);
  }

  alternarSeleccion(archivo: ArchivoImportado): void {
    this.seleccion.update(actual => {
      const copia = new Set(actual);
      if (copia.has(archivo.id)) {
        copia.delete(archivo.id);
      } else {
        copia.add(archivo.id);
      }
      return copia;
    });
  }

  limpiarSeleccion(): void {
    this.seleccion.set(new Set());
  }

  abrirConsolidar(): void {
    this.consolidarForm.reset({ titulo: '' });
    this.errorConsolidar.set(null);
  }

  consolidar(): void {
    if (this.mensajeSeleccion() || this.consolidando()) {
      return;
    }
    const titulo = this.consolidarForm.controls.titulo.value.trim();
    this.consolidando.set(true);
    this.errorConsolidar.set(null);

    this.reportes.consolidarArchivos({ archivos: [...this.seleccion()], titulo: titulo || undefined }).subscribe({
      next: informe => {
        this.consolidando.set(false);
        cerrarModal(ID_MODAL_CONSOLIDAR);
        this.limpiarSeleccion();
        this.informeGenerado.emit(informe.id);
      },
      error: error => {
        this.consolidando.set(false);
        const errores = erroresPorCampo(error, ['archivos', 'titulo'], 'No se pudo generar el consolidado.');
        this.errorConsolidar.set(errores.porCampo['archivos'] ?? errores.porCampo['titulo'] ?? errores.general);
      }
    });
  }

  // --- Acciones por fila ---

  abrirImportar(): void {
    this.solicitudFormulario.set({ archivo: null, n: ++this.contador });
  }

  abrirEditar(archivo: ArchivoImportado): void {
    this.solicitudFormulario.set({ archivo, n: ++this.contador });
  }

  abrirVistaPrevia(archivo: ArchivoImportado): void {
    this.solicitudVistaPrevia.set({ archivo, n: ++this.contador });
  }

  alGuardar(): void {
    this.recargar();
  }

  descargar(archivo: ArchivoImportado): void {
    this.errorAccion.set(null);
    this.reportes.descargarArchivo(archivo.id).subscribe({
      next: blob => guardarBlob(blob, archivo.archivo_nombre ?? `${archivo.titulo}.${archivo.formato}`),
      error: error => this.errorAccion.set(mensajeError(error, 'No se pudo descargar el archivo.'))
    });
  }

  cambiarEstado(archivo: ArchivoImportado): void {
    this.accionEnCurso.set(archivo.id);
    this.errorAccion.set(null);
    const peticion = archivo.activo ? this.reportes.archivarArchivo(archivo.id) : this.reportes.restaurarArchivo(archivo.id);

    peticion.subscribe({
      next: () => {
        this.accionEnCurso.set(null);
        this.seleccion.update(actual => {
          const copia = new Set(actual);
          copia.delete(archivo.id);
          return copia;
        });
        this.recargar();
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo cambiar el estado del archivo.'));
      }
    });
  }

  pedirEliminar(archivo: ArchivoImportado): void {
    this.archivoPorEliminar.set(archivo.id);
    this.errorAccion.set(null);
  }

  cancelarEliminar(): void {
    this.archivoPorEliminar.set(null);
  }

  confirmarEliminar(archivo: ArchivoImportado): void {
    this.accionEnCurso.set(archivo.id);
    this.errorAccion.set(null);

    this.reportes.eliminarArchivo(archivo.id).subscribe({
      next: () => {
        this.accionEnCurso.set(null);
        this.archivoPorEliminar.set(null);
        this.recargar();
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.archivoPorEliminar.set(null);
        // Por ejemplo: "Está incluido en informes; elimínalos o déjalo archivado."
        this.errorAccion.set(mensajeError(error, 'No se pudo eliminar el archivo.'));
      }
    });
  }

}
