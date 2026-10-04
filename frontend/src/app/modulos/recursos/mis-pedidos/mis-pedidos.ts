import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RecursosService } from '../../../servicios/recursos';
import { SolicitudRecursos, TipoRecurso } from '../../../modelos/recursos';
import {
  PRIORIDADES_SOLICITUD,
  etiquetaEstadoSolicitud,
  etiquetaPrioridadSolicitud
} from '../../../utilidades/pedidos';
import { cerrarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { DetallePedido } from '../detalle-pedido/detalle-pedido';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

@Component({
  selector: 'app-mis-pedidos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DetallePedido, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './mis-pedidos.html',
  styleUrl: './mis-pedidos.css',
})
export class MisPedidos implements OnInit {

  mensajeControl = mensajeControl;

  private recursosService = inject(RecursosService);

  moduloId = input.required<number>();

  prioridades = PRIORIDADES_SOLICITUD;
  etiquetaEstado = etiquetaEstadoSolicitud;
  etiquetaPrioridad = etiquetaPrioridadSolicitud;

  private idActual = Number(localStorage.getItem('trainet_id'));

  pedidos = signal<SolicitudRecursos[]>([]);
  paginacion = crearPaginacion(() => this.pedidos());
  cargando = signal(false);
  error = signal<string | null>(null);

  tipos = signal<TipoRecurso[]>([]);
  errorTipos = signal<string | null>(null);

  pedidoForm = new FormGroup({
    fo_tipo_recurso: new FormControl<number | null>(null, { validators: [Validators.required] }),
    cantidad: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    prioridad: new FormControl('media', { nonNullable: true, validators: [Validators.required] }),
    justificacion: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] })
  });
  enviando = signal(false);
  errorEnvio = signal<string | null>(null);
  exitoEnvio = signal<string | null>(null);

  pedidoSeleccionado = signal<SolicitudRecursos | null>(null);

  pedidoACancelar = signal<SolicitudRecursos | null>(null);
  cancelando = signal(false);
  errorCancelar = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarPedidos();

    this.recursosService.listarTipos().subscribe({
      next: tipos => this.tipos.set(tipos),
      error: error => this.errorTipos.set(mensajeError(error, 'No se pudieron cargar los tipos de recurso.'))
    });
  }

  cargarPedidos(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.recursosService.listarSolicitudes().subscribe({
      next: pedidos => {
        // Los roles de gestión reciben todos los pedidos; aquí solo se muestran los propios.
        this.pedidos.set(pedidos.filter(pedido => pedido.fo_usuario === this.idActual));
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudo cargar la lista de pedidos.'));
        this.cargando.set(false);
      }
    });
  }

  enviar(): void {
    if (this.pedidoForm.invalid) {
      marcarInvalidos(this.pedidoForm);
      return;
    }

    const valores = this.pedidoForm.getRawValue();
    if (this.pedidoForm.invalid || valores.fo_tipo_recurso === null) {
      return;
    }

    this.enviando.set(true);
    this.errorEnvio.set(null);
    this.exitoEnvio.set(null);

    this.recursosService.crearSolicitud({
      cantidad: valores.cantidad,
      justificacion: valores.justificacion.trim(),
      prioridad: valores.prioridad,
      fo_tipo_recurso: valores.fo_tipo_recurso,
      fo_mod_pedido: this.moduloId()
    }).subscribe({
      next: pedido => {
        this.enviando.set(false);
        this.exitoEnvio.set(`Pedido #${pedido.id} registrado.`);
        this.pedidoForm.reset({ fo_tipo_recurso: null, cantidad: 1, prioridad: 'media', justificacion: '' });
        this.cargarPedidos();
      },
      error: error => {
        this.enviando.set(false);
        this.errorEnvio.set(mensajeError(error, 'No se pudo registrar el pedido.'));
      }
    });
  }

  verPedido(pedido: SolicitudRecursos): void {
    this.pedidoSeleccionado.set(pedido);
  }

  abrirCancelar(pedido: SolicitudRecursos): void {
    this.pedidoACancelar.set(pedido);
    this.errorCancelar.set(null);
  }

  confirmarCancelar(): void {
    const pedido = this.pedidoACancelar();
    if (!pedido) {
      return;
    }

    this.cancelando.set(true);
    this.errorCancelar.set(null);

    this.recursosService.cancelarSolicitud(pedido.id).subscribe({
      next: () => {
        this.cancelando.set(false);
        cerrarModal('modalCancelarPedido');
        this.cargarPedidos();
      },
      error: error => {
        this.cancelando.set(false);
        this.errorCancelar.set(mensajeError(error, 'No se pudo cancelar el pedido.'));
      }
    });
  }

}
