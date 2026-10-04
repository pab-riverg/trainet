import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComprasService } from '../../../../servicios/compras';
import { ProveedoresService } from '../../../../servicios/proveedores';
import { CotizacionCompra, ProveedorSugerido, SolicitudCompra } from '../../../../modelos/compras';
import { Proveedor } from '../../../../modelos/proveedores';
import { ROLES_GESTION_COMPRAS } from '../../../../modelos/permisos-compras';
import { guardarBlob, nombreDeArchivo } from '../../../../utilidades/archivos';
import { formatearPrecio } from '../../../../utilidades/compras';
import { mensajeError } from '../../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../../utilidades/formularios';
import { Moneda } from '../../../../compartidos/moneda';
import { BotonAccion } from '../../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../../compartidos/estado-badge/estado-badge';

const LIMITE_TAMANO_ARCHIVO = 10 * 1024 * 1024;
const EXTENSIONES_COTIZACION = ['pdf', 'doc', 'docx'];

// Cotizaciones de la solicitud: administración las carga mientras está aprobada; directivo las revisa.
@Component({
  selector: 'app-seccion-cotizaciones',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, Moneda, BotonAccion, EstadoBadge],
  templateUrl: './seccion-cotizaciones.html',
})
export class SeccionCotizaciones {

  mensajeControl = mensajeControl;

  private comprasService = inject(ComprasService);
  private proveedoresService = inject(ProveedoresService);

  solicitud = input.required<SolicitudCompra>();
  cotizaciones = input<CotizacionCompra[]>([]);
  cargando = input(false);
  errorCarga = input<string | null>(null);
  // La lista cambió (se subió o eliminó una cotización): el modal debe recargarla.
  cotizacionesCambiaron = output<void>();

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  formatearPrecio = formatearPrecio;
  nombreDeArchivo = nombreDeArchivo;

  sugeridos = signal<ProveedorSugerido[]>([]);
  otros = signal<Proveedor[]>([]);
  errorProveedores = signal<string | null>(null);

  cotizacionForm = new FormGroup({
    fo_proveedor: new FormControl<number | null>(null, { validators: [Validators.required] }),
    monto_total: new FormControl<number | null>(null, { validators: [Validators.required, Validators.min(1)] }),
    iva: new FormControl<number | null>(null, { validators: [Validators.min(0)] })
  });
  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  subiendo = signal(false);
  errorSubida = signal<string | null>(null);
  advertencia = signal<string | null>(null);

  accionEnCurso = signal<number | null>(null);
  errorAccion = signal<string | null>(null);
  cotizacionPorEliminar = signal<number | null>(null);

  private rol = localStorage.getItem('trainet_rol') ?? '';

  puedeCargar = computed(() => ROLES_GESTION_COMPRAS.includes(this.rol) && this.solicitud().estado === 'aprobada');
  puedeEliminar = computed(() => ROLES_GESTION_COMPRAS.includes(this.rol) && this.solicitud().estado === 'aprobada');

  // computed: el efecto solo se repite cuando cambia el id, no con cada respuesta del servidor.
  private idSolicitud = computed(() => this.solicitud().id);

  constructor() {
    // Los proveedores solo se piden cuando hay formulario de carga y al cambiar de solicitud.
    effect(() => {
      const id = this.idSolicitud();
      const cargar = this.puedeCargar();
      untracked(() => {
        this.advertencia.set(null);
        this.errorSubida.set(null);
        this.errorAccion.set(null);
        this.cotizacionPorEliminar.set(null);
        this.cotizacionForm.reset({ fo_proveedor: null, monto_total: null, iva: null });
        this.limpiarArchivo();
        if (cargar) {
          this.cargarProveedores(id);
        }
      });
    });
  }

  private cargarProveedores(idSolicitud: number): void {
    this.errorProveedores.set(null);

    this.comprasService.listarProveedoresSugeridos(idSolicitud).subscribe({
      next: sugeridos => {
        this.sugeridos.set(sugeridos);
        this.proveedoresService.listarProveedores().subscribe({
          next: proveedores => {
            const idsSugeridos = new Set(sugeridos.map(p => p.id));
            this.otros.set(proveedores.filter(p => p.estado !== 'inactivo' && !idsSugeridos.has(p.id)));
          },
          error: error => this.errorProveedores.set(mensajeError(error, 'No se pudo cargar la lista de proveedores.'))
        });
      },
      error: error => this.errorProveedores.set(mensajeError(error, 'No se pudieron cargar los proveedores sugeridos.'))
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

  subir(): void {
    const sinArchivo = !this.archivoSeleccionado();
    if (this.cotizacionForm.invalid || sinArchivo) {
      marcarInvalidos(this.cotizacionForm);
      if (sinArchivo) {
        this.errorArchivo.set('Selecciona un archivo.');
      }
      return;
    }

    const valores = this.cotizacionForm.getRawValue();
    const archivo = this.archivoSeleccionado();
    if (this.cotizacionForm.invalid || !archivo || valores.fo_proveedor === null || valores.monto_total === null) {
      return;
    }

    this.subiendo.set(true);
    this.errorSubida.set(null);
    this.advertencia.set(null);

    this.comprasService.subirCotizacion({
      fo_solicitud: this.solicitud().id,
      fo_proveedor: valores.fo_proveedor,
      monto_total: Math.trunc(valores.monto_total),
      iva: valores.iva !== null ? Math.trunc(valores.iva) : undefined
    }, archivo).subscribe({
      next: cotizacion => {
        this.subiendo.set(false);
        // Aviso no bloqueante: la cotización ya quedó guardada.
        this.advertencia.set(cotizacion.advertencia ?? null);
        this.cotizacionForm.reset({ fo_proveedor: null, monto_total: null, iva: null });
        this.limpiarArchivo();
        this.cotizacionesCambiaron.emit();
      },
      error: error => {
        this.subiendo.set(false);
        this.errorSubida.set(mensajeError(error, 'No se pudo subir la cotización.'));
      }
    });
  }

  descargar(cotizacion: CotizacionCompra): void {
    this.errorAccion.set(null);
    this.accionEnCurso.set(cotizacion.id);

    this.comprasService.descargarCotizacion(cotizacion.id).subscribe({
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

  pedirEliminar(cotizacion: CotizacionCompra): void {
    this.cotizacionPorEliminar.set(cotizacion.id);
  }

  cancelarEliminar(): void {
    this.cotizacionPorEliminar.set(null);
  }

  confirmarEliminar(cotizacion: CotizacionCompra): void {
    this.errorAccion.set(null);
    this.accionEnCurso.set(cotizacion.id);

    this.comprasService.eliminarCotizacion(cotizacion.id).subscribe({
      next: () => {
        this.accionEnCurso.set(null);
        this.cotizacionPorEliminar.set(null);
        this.cotizacionesCambiaron.emit();
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.cotizacionPorEliminar.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo eliminar la cotización.'));
      }
    });
  }

}
