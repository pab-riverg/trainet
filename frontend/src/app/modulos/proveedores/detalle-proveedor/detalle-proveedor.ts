import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ProveedoresService } from '../../../servicios/proveedores';
import { ContratoProveedor, CotizacionProveedor, EstadoCotizacion, Proveedor } from '../../../modelos/proveedores';
import { ROLES_APROBACION_ACUERDOS, ROLES_GESTION_PROVEEDORES } from '../../../modelos/permisos-proveedores';
import {
  etiquetaEstadoContrato,
  etiquetaEstadoCotizacion,
  etiquetaEstadoProveedor
} from '../../../utilidades/proveedores';
import { guardarBlob, nombreDeArchivo } from '../../../utilidades/archivos';
import { mensajeError } from '../../../utilidades/errores';
import { NitPipe } from '../../../compartidos/pipes-numeros';
import { TelefonoPipe } from '../../../compartidos/pipes-numeros';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

const LIMITE_TAMANO_ARCHIVO = 10 * 1024 * 1024;
const EXTENSIONES_COTIZACION = ['pdf', 'doc', 'docx'];

@Component({
  selector: 'app-detalle-proveedor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, NitPipe, TelefonoPipe, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './detalle-proveedor.html',
  styleUrl: './detalle-proveedor.css',
})
export class DetalleProveedor {

  private proveedoresService = inject(ProveedoresService);

  proveedor = input<Proveedor | null>(null);
  cambio = output<void>();

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  etiquetaEstadoProveedor = etiquetaEstadoProveedor;
  etiquetaEstadoCotizacion = etiquetaEstadoCotizacion;
  etiquetaEstadoContrato = etiquetaEstadoContrato;
  nombreDeArchivo = nombreDeArchivo;

  cotizaciones = signal<CotizacionProveedor[]>([]);
  paginacionCotizaciones = crearPaginacion(() => this.cotizaciones());
  cargandoCotizaciones = signal(false);
  errorCotizaciones = signal<string | null>(null);

  historial = signal<ContratoProveedor[]>([]);
  paginacionAcuerdos = crearPaginacion(() => this.historial());
  cargandoHistorial = signal(false);
  errorHistorial = signal<string | null>(null);

  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  subiendo = signal(false);
  errorSubida = signal<string | null>(null);

  accionEnCurso = signal<number | null>(null);
  errorAccion = signal<string | null>(null);
  cotizacionPorEliminar = signal<number | null>(null);

  // Copia local del proveedor abierto: se refresca tras decidir, finalizar o cancelar un acuerdo.
  proveedorActual = signal<Proveedor | null>(null);

  contratoPorEliminar = signal<number | null>(null);
  contratoEnCurso = signal<number | null>(null);
  errorContrato = signal<string | null>(null);
  contratoRechazando = signal<number | null>(null);
  motivoControl = new FormControl('', { nonNullable: true });

  puedeGestionar = computed(() => ROLES_GESTION_PROVEEDORES.includes(localStorage.getItem('trainet_rol') ?? ''));
  puedeAprobar = computed(() => ROLES_APROBACION_ACUERDOS.includes(localStorage.getItem('trainet_rol') ?? ''));

  constructor() {
    effect(() => {
      const proveedor = this.proveedor();
      // Otro proveedor: ambas listas empiezan en la primera página.
      this.paginacionCotizaciones.reiniciar();
      this.paginacionAcuerdos.reiniciar();
      // untracked: solo el cambio de proveedor debe volver a ejecutar este bloque.
      untracked(() => {
        this.proveedorActual.set(proveedor);
        this.contratoPorEliminar.set(null);
        this.errorAccion.set(null);
        this.errorSubida.set(null);
        this.errorContrato.set(null);
        this.contratoRechazando.set(null);
        this.cotizacionPorEliminar.set(null);
        this.limpiarArchivo();

        if (proveedor) {
          this.cargarCotizaciones(proveedor.id);
          this.cargarHistorial(proveedor.id);
        } else {
          this.cotizaciones.set([]);
          this.historial.set([]);
        }
      });
    });
  }

  private cargarCotizaciones(idProveedor: number): void {
    this.cargandoCotizaciones.set(true);
    this.errorCotizaciones.set(null);

    this.proveedoresService.listarCotizaciones(idProveedor).subscribe({
      next: cotizaciones => {
        this.cotizaciones.set(cotizaciones);
        this.cargandoCotizaciones.set(false);
      },
      error: error => {
        this.errorCotizaciones.set(mensajeError(error, 'No se pudieron cargar las cotizaciones.'));
        this.cargandoCotizaciones.set(false);
      }
    });
  }

  private cargarHistorial(idProveedor: number): void {
    this.cargandoHistorial.set(true);
    this.errorHistorial.set(null);

    this.proveedoresService.historialProveedor(idProveedor).subscribe({
      next: contratos => {
        this.historial.set(contratos);
        this.cargandoHistorial.set(false);
      },
      error: error => {
        this.errorHistorial.set(mensajeError(error, 'No se pudo cargar el historial de contrataciones.'));
        this.cargandoHistorial.set(false);
      }
    });
  }

  private limpiarArchivo(): void {
    this.archivoSeleccionado.set(null);
    this.errorArchivo.set(null);
    const input = this.archivoInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.errorArchivo.set(null);

    if (archivo) {
      const extension = archivo.name.split('.').pop()?.toLowerCase() ?? '';
      if (!EXTENSIONES_COTIZACION.includes(extension)) {
        this.errorArchivo.set('Solo se permiten archivos PDF o Word (.pdf, .doc, .docx).');
        this.limpiarArchivo();
        return;
      }
      if (archivo.size > LIMITE_TAMANO_ARCHIVO) {
        this.errorArchivo.set('El archivo supera el límite de 10 MB.');
        this.limpiarArchivo();
        return;
      }
    }

    this.archivoSeleccionado.set(archivo);
  }

  subirCotizacion(): void {
    const proveedor = this.proveedor();
    const archivo = this.archivoSeleccionado();
    if (!proveedor || !archivo) {
      return;
    }

    this.subiendo.set(true);
    this.errorSubida.set(null);

    this.proveedoresService.subirCotizacion(archivo, proveedor.id).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.limpiarArchivo();
        this.cargarCotizaciones(proveedor.id);
        this.cambio.emit();
      },
      error: error => {
        this.subiendo.set(false);
        this.errorSubida.set(mensajeError(error, 'No se pudo subir la cotización.'));
      }
    });
  }

  descargar(cotizacion: CotizacionProveedor): void {
    this.errorAccion.set(null);
    this.accionEnCurso.set(cotizacion.id);

    this.proveedoresService.descargarCotizacion(cotizacion.id).subscribe({
      next: blob => {
        this.accionEnCurso.set(null);
        guardarBlob(blob, nombreDeArchivo(cotizacion.archivo) || `cotizacion-${cotizacion.id}`);
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo descargar la cotización.'));
      }
    });
  }

  cambiarEstado(cotizacion: CotizacionProveedor, estado: EstadoCotizacion): void {
    const proveedor = this.proveedor();
    if (!proveedor) {
      return;
    }

    this.errorAccion.set(null);
    this.accionEnCurso.set(cotizacion.id);

    this.proveedoresService.actualizarEstadoCotizacion(cotizacion.id, estado).subscribe({
      next: () => {
        this.accionEnCurso.set(null);
        this.cargarCotizaciones(proveedor.id);
        this.cambio.emit();
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo actualizar el estado de la cotización.'));
      }
    });
  }

  // --- Acuerdos: revisar archivos y decidir (doble check) ---

  descargarArchivoContrato(contrato: ContratoProveedor): void {
    this.errorContrato.set(null);
    this.contratoEnCurso.set(contrato.id);

    this.proveedoresService.descargarContrato(contrato.id).subscribe({
      next: blob => {
        this.contratoEnCurso.set(null);
        guardarBlob(blob, nombreDeArchivo(contrato.archivo ?? '') || `acuerdo-${contrato.id}`);
      },
      error: error => {
        this.contratoEnCurso.set(null);
        this.errorContrato.set(mensajeError(error, 'No se pudo descargar el archivo del acuerdo.'));
      }
    });
  }

  descargarCotizacionDeContrato(contrato: ContratoProveedor): void {
    if (!contrato.fo_cotizacion) {
      return;
    }

    this.errorContrato.set(null);
    this.contratoEnCurso.set(contrato.id);

    this.proveedoresService.descargarCotizacion(contrato.fo_cotizacion).subscribe({
      next: blob => {
        this.contratoEnCurso.set(null);
        guardarBlob(blob, nombreDeArchivo(contrato.cotizacion_archivo ?? '') || `cotizacion-${contrato.fo_cotizacion}`);
      },
      error: error => {
        this.contratoEnCurso.set(null);
        this.errorContrato.set(mensajeError(error, 'No se pudo descargar la cotización.'));
      }
    });
  }

  aprobarContrato(contrato: ContratoProveedor): void {
    this.decidir(contrato, { estado: 'aprobado' });
  }

  abrirRechazo(contrato: ContratoProveedor): void {
    this.contratoRechazando.set(contrato.id);
    this.motivoControl.reset('');
    this.errorContrato.set(null);
  }

  cancelarRechazo(): void {
    this.contratoRechazando.set(null);
  }

  confirmarRechazo(contrato: ContratoProveedor): void {
    const motivo = this.motivoControl.value.trim();
    if (!motivo) {
      this.errorContrato.set('El motivo es obligatorio para rechazar un acuerdo.');
      return;
    }
    this.decidir(contrato, { estado: 'rechazado', motivo });
  }

  // Recarga historial y perfil (el estado del proveedor depende de los acuerdos vigentes) y avisa al padre.
  private actualizarTrasCambioDeContrato(idProveedor: number): void {
    this.cargarHistorial(idProveedor);
    this.proveedoresService.obtenerProveedor(idProveedor).subscribe({
      next: proveedor => this.proveedorActual.set(proveedor),
      error: error => this.errorContrato.set(mensajeError(error, 'No se pudo actualizar el perfil del proveedor.'))
    });
    this.cambio.emit();
  }

  cerrarAcuerdo(contrato: ContratoProveedor, estado: 'finalizado' | 'cancelado'): void {
    const proveedor = this.proveedor();
    if (!proveedor) {
      return;
    }

    this.errorContrato.set(null);
    this.contratoEnCurso.set(contrato.id);

    this.proveedoresService.actualizarContrato(contrato.id, { estado }).subscribe({
      next: () => {
        this.contratoEnCurso.set(null);
        this.actualizarTrasCambioDeContrato(proveedor.id);
      },
      error: error => {
        this.contratoEnCurso.set(null);
        this.errorContrato.set(mensajeError(error, 'No se pudo actualizar el estado del acuerdo.'));
      }
    });
  }

  pedirEliminarContrato(contrato: ContratoProveedor): void {
    this.contratoPorEliminar.set(contrato.id);
  }

  cancelarEliminarContrato(): void {
    this.contratoPorEliminar.set(null);
  }

  confirmarEliminarContrato(contrato: ContratoProveedor): void {
    const proveedor = this.proveedor();
    if (!proveedor) {
      return;
    }

    this.errorContrato.set(null);
    this.contratoEnCurso.set(contrato.id);

    this.proveedoresService.eliminarContrato(contrato.id).subscribe({
      next: () => {
        this.contratoEnCurso.set(null);
        this.contratoPorEliminar.set(null);
        this.actualizarTrasCambioDeContrato(proveedor.id);
      },
      error: error => {
        this.contratoEnCurso.set(null);
        this.contratoPorEliminar.set(null);
        this.errorContrato.set(mensajeError(error, 'No se pudo eliminar el acuerdo.'));
      }
    });
  }

  private decidir(contrato: ContratoProveedor, datos: { estado: 'aprobado' | 'rechazado'; motivo?: string }): void {
    const proveedor = this.proveedor();
    if (!proveedor) {
      return;
    }

    this.errorContrato.set(null);
    this.contratoEnCurso.set(contrato.id);

    this.proveedoresService.decidirContrato(contrato.id, datos).subscribe({
      next: () => {
        this.contratoEnCurso.set(null);
        this.contratoRechazando.set(null);
        this.actualizarTrasCambioDeContrato(proveedor.id);
      },
      error: error => {
        this.contratoEnCurso.set(null);
        this.errorContrato.set(mensajeError(error, 'No se pudo registrar la decisión.'));
      }
    });
  }

  pedirEliminar(cotizacion: CotizacionProveedor): void {
    this.cotizacionPorEliminar.set(cotizacion.id);
  }

  cancelarEliminar(): void {
    this.cotizacionPorEliminar.set(null);
  }

  confirmarEliminar(cotizacion: CotizacionProveedor): void {
    const proveedor = this.proveedor();
    if (!proveedor) {
      return;
    }

    this.errorAccion.set(null);
    this.accionEnCurso.set(cotizacion.id);

    this.proveedoresService.eliminarCotizacion(cotizacion.id).subscribe({
      next: () => {
        this.accionEnCurso.set(null);
        this.cotizacionPorEliminar.set(null);
        this.cargarCotizaciones(proveedor.id);
        this.cambio.emit();
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.cotizacionPorEliminar.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo eliminar la cotización.'));
      }
    });
  }

}
