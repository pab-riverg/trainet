import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RecursosService } from '../../../servicios/recursos';
import { TipoRecurso } from '../../../modelos/recursos';
import { cerrarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

@Component({
  selector: 'app-catalogo-recursos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion, Paginador],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
})
export class CatalogoRecursos implements OnInit {

  mensajeControl = mensajeControl;

  private recursosService = inject(RecursosService);

  tipos = signal<TipoRecurso[]>([]);
  paginacion = crearPaginacion(() => this.tipos());
  cargando = signal(false);
  error = signal<string | null>(null);

  tipoForm = new FormGroup({
    nombre_tipo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    disponible: new FormControl(true, { nonNullable: true })
  });
  creando = signal(false);
  errorCrear = signal<string | null>(null);

  cambiandoId = signal<number | null>(null);
  errorCambio = signal<string | null>(null);

  tipoAEliminar = signal<TipoRecurso | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarTipos();
  }

  cargarTipos(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.recursosService.listarTipos().subscribe({
      next: tipos => {
        this.tipos.set(tipos);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudo cargar el catálogo de recursos.'));
        this.cargando.set(false);
      }
    });
  }

  crear(): void {
    if (this.tipoForm.invalid) {
      marcarInvalidos(this.tipoForm);
      return;
    }

    if (this.tipoForm.invalid) {
      return;
    }

    const { nombre_tipo, disponible } = this.tipoForm.getRawValue();
    this.creando.set(true);
    this.errorCrear.set(null);

    this.recursosService.crearTipo({ nombre_tipo: nombre_tipo.trim(), disponible }).subscribe({
      next: () => {
        this.creando.set(false);
        this.tipoForm.reset({ nombre_tipo: '', disponible: true });
        this.cargarTipos();
      },
      error: error => {
        this.creando.set(false);
        this.errorCrear.set(mensajeError(error, 'No se pudo crear el tipo de recurso.'));
      }
    });
  }

  cambiarDisponible(tipo: TipoRecurso, evento: Event): void {
    const interruptor = evento.target as HTMLInputElement;
    const nuevoValor = interruptor.checked;

    this.cambiandoId.set(tipo.id);
    this.errorCambio.set(null);

    this.recursosService.actualizarTipo(tipo.id, { disponible: nuevoValor }).subscribe({
      next: actualizado => {
        this.cambiandoId.set(null);
        this.tipos.update(lista => lista.map(item => (item.id === actualizado.id ? actualizado : item)));
      },
      error: error => {
        this.cambiandoId.set(null);
        interruptor.checked = tipo.disponible;
        this.errorCambio.set(mensajeError(error, 'No se pudo cambiar la disponibilidad.'));
      }
    });
  }

  abrirEliminar(tipo: TipoRecurso): void {
    this.tipoAEliminar.set(tipo);
    this.errorEliminar.set(null);
  }

  confirmarEliminar(): void {
    const tipo = this.tipoAEliminar();
    if (!tipo) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.recursosService.eliminarTipo(tipo.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        cerrarModal('modalEliminarTipoRecurso');
        this.cargarTipos();
      },
      error: error => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeError(error, 'No se pudo eliminar el tipo de recurso.'));
      }
    });
  }

}
