import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComprasService } from '../../../../servicios/compras';
import { FacturaCompra, SolicitudCompra } from '../../../../modelos/compras';
import { ROLES_GESTION_COMPRAS } from '../../../../modelos/permisos-compras';
import { guardarBlob, nombreDeArchivo } from '../../../../utilidades/archivos';
import { mensajeError } from '../../../../utilidades/errores';
import { BotonAccion } from '../../../../compartidos/boton-accion/boton-accion';

const LIMITE_TAMANO_ARCHIVO = 10 * 1024 * 1024;
const EXTENSIONES_FACTURA = ['pdf', 'png', 'jpg', 'jpeg'];

// Facturas de la compra: las ve quien puede ver la solicitud; administración las carga y las borra
// (el backend impide borrar las de una solicitud ya recibida).
@Component({
  selector: 'app-seccion-facturas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, BotonAccion],
  templateUrl: './seccion-facturas.html',
})
export class SeccionFacturas {

  private comprasService = inject(ComprasService);

  solicitud = input.required<SolicitudCompra>();
  // Hubo un cambio en las facturas (para que el modal refresque la lista de solicitudes si lo necesita).
  facturasCambiaron = output<void>();

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  nombreDeArchivo = nombreDeArchivo;

  facturas = signal<FacturaCompra[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  descripcionControl = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] });
  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  subiendo = signal(false);
  errorSubida = signal<string | null>(null);

  accionEnCurso = signal<number | null>(null);
  errorAccion = signal<string | null>(null);
  facturaPorEliminar = signal<number | null>(null);

  private rol = localStorage.getItem('trainet_rol') ?? '';

  puedeGestionar = computed(() => ROLES_GESTION_COMPRAS.includes(this.rol));

  // Una solicitud ya recibida no admite borrar facturas (el backend responde 400); la acción ni se ofrece.
  puedeEliminar = computed(() => this.puedeGestionar() && this.solicitud().estado !== 'recibida');

  private idSolicitud = computed(() => this.solicitud().id);

  constructor() {
    effect(() => {
      const id = this.idSolicitud();
      untracked(() => {
        this.descripcionControl.reset('');
        this.errorSubida.set(null);
        this.errorAccion.set(null);
        this.facturaPorEliminar.set(null);
        this.limpiarArchivo();
        this.cargar(id);
      });
    });
  }

  private cargar(idSolicitud: number): void {
    this.cargando.set(true);
    this.error.set(null);

    this.comprasService.listarFacturas(idSolicitud).subscribe({
      next: facturas => {
        this.facturas.set(facturas);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudieron cargar las facturas.'));
        this.cargando.set(false);
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
      if (!EXTENSIONES_FACTURA.includes(extension)) {
        this.errorArchivo.set('Solo se permiten PDF o imágenes (.pdf, .png, .jpg, .jpeg).');
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
    const archivo = this.archivoSeleccionado();
    if (!archivo || this.descripcionControl.invalid) {
      return;
    }

    this.subiendo.set(true);
    this.errorSubida.set(null);

    this.comprasService.subirFactura({
      fo_solicitud: this.solicitud().id,
      descripcion: this.descripcionControl.value.trim() || undefined
    }, archivo).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.descripcionControl.reset('');
        this.limpiarArchivo();
        this.cargar(this.solicitud().id);
        this.facturasCambiaron.emit();
      },
      error: error => {
        this.subiendo.set(false);
        this.errorSubida.set(mensajeError(error, 'No se pudo subir la factura.'));
      }
    });
  }

  descargar(factura: FacturaCompra): void {
    this.errorAccion.set(null);
    this.accionEnCurso.set(factura.id);

    this.comprasService.descargarFactura(factura.id).subscribe({
      next: blob => {
        this.accionEnCurso.set(null);
        guardarBlob(blob, nombreDeArchivo(factura.archivo) || `factura-${factura.id}`);
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo descargar la factura.'));
      }
    });
  }

  pedirEliminar(factura: FacturaCompra): void {
    this.facturaPorEliminar.set(factura.id);
  }

  cancelarEliminar(): void {
    this.facturaPorEliminar.set(null);
  }

  confirmarEliminar(factura: FacturaCompra): void {
    this.errorAccion.set(null);
    this.accionEnCurso.set(factura.id);

    this.comprasService.eliminarFactura(factura.id).subscribe({
      next: () => {
        this.accionEnCurso.set(null);
        this.facturaPorEliminar.set(null);
        this.cargar(this.solicitud().id);
        this.facturasCambiaron.emit();
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.facturaPorEliminar.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo eliminar la factura.'));
      }
    });
  }

}
