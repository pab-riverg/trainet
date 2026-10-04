import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ComprasService } from '../../../servicios/compras';
import { CarritoService } from '../../../servicios/carrito';
import { LineaCarrito } from '../../../modelos/compras';
import { formatearPrecio } from '../../../utilidades/compras';
import { mensajeError } from '../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';

@Component({
  selector: 'app-carrito',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion],
  templateUrl: './carrito.html',
  styleUrl: './carrito.css',
})
export class Carrito {

  mensajeControl = mensajeControl;

  private comprasService = inject(ComprasService);
  carrito = inject(CarritoService);

  irATienda = output<void>();
  solicitudEnviada = output<number>();

  formatearPrecio = formatearPrecio;

  solicitudForm = new FormGroup({
    area: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    nota: new FormControl('', { nonNullable: true })
  });

  enviando = signal(false);
  errorEnvio = signal<string | null>(null);

  // Líneas cuyo campo de justificación el usuario desplegó (las que ya tienen texto se muestran abiertas).
  justificacionesAbiertas = signal<number[]>([]);

  justificacionVisible(linea: LineaCarrito): boolean {
    return linea.justificacion.length > 0 || this.justificacionesAbiertas().includes(linea.articulo.id);
  }

  abrirJustificacion(idArticulo: number): void {
    this.justificacionesAbiertas.update(ids => [...ids, idArticulo]);
  }

  cambiarCantidad(linea: LineaCarrito, cantidad: number): void {
    this.carrito.cambiarCantidad(linea.articulo.id, cantidad);
  }

  cambiarCantidadDesdeCampo(linea: LineaCarrito, evento: Event): void {
    const campo = evento.target as HTMLInputElement;
    this.carrito.cambiarCantidad(linea.articulo.id, Number(campo.value));
    // Refleja el valor acotado (1 a 99) en el campo.
    campo.value = String(this.carrito.cantidadDe(linea.articulo.id));
  }

  cambiarJustificacion(linea: LineaCarrito, evento: Event): void {
    this.carrito.cambiarJustificacion(linea.articulo.id, (evento.target as HTMLTextAreaElement).value);
  }

  confirmar(): void {
    if (this.solicitudForm.invalid) {
      marcarInvalidos(this.solicitudForm);
      return;
    }

    if (this.solicitudForm.invalid || this.carrito.numeroLineas() === 0) {
      return;
    }

    const { area, nota } = this.solicitudForm.getRawValue();
    this.enviando.set(true);
    this.errorEnvio.set(null);

    this.comprasService.crearSolicitud({
      area: area.trim(),
      nota: nota.trim() || undefined,
      items: this.carrito.lineas().map(linea => ({
        fo_articulo: linea.articulo.id,
        cantidad: linea.cantidad,
        justificacion: linea.justificacion.trim() || undefined
      }))
    }).subscribe({
      next: solicitud => {
        this.enviando.set(false);
        this.carrito.vaciar();
        this.solicitudForm.reset({ area: '', nota: '' });
        this.justificacionesAbiertas.set([]);
        this.solicitudEnviada.emit(solicitud.id);
      },
      error: error => {
        this.enviando.set(false);
        this.errorEnvio.set(mensajeError(error, 'No se pudo enviar la solicitud de compra.'));
      }
    });
  }

}
