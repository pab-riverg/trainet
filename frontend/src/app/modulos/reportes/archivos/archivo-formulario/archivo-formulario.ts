import {
  ChangeDetectionStrategy, Component, ElementRef, effect, inject, input, output, signal, untracked, viewChild
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReportesService } from '../../../../servicios/reportes';
import { ArchivoImportado, TipoReporte } from '../../../../modelos/reportes';
import { aIso, errorArchivoImportacion, erroresPorCampo, formatearTamano } from '../../../../utilidades/reportes';
import { marcarInvalidos, mensajeControl } from '../../../../utilidades/formularios';
import { cerrarModal } from '../../../../utilidades/modal';

export const ID_MODAL_ARCHIVO = 'modalArchivoImportado';

// Cada apertura del modal trae un contador `n` para reiniciar el formulario aunque se abra dos veces igual.
export interface SolicitudFormulario {
  archivo: ArchivoImportado | null;
  n: number;
}

const CAMPOS_API = ['titulo', 'descripcion', 'fo_tipo', 'fecha_documento', 'archivo'] as const;

// Modal para importar un archivo nuevo (archivo = null) o editar los datos de uno existente.
@Component({
  selector: 'app-archivo-formulario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './archivo-formulario.html',
})
export class ArchivoFormulario {

  private reportes = inject(ReportesService);

  solicitud = input<SolicitudFormulario | null>(null);
  // Tipos de origen 'archivo'.
  tipos = input<TipoReporte[]>([]);
  guardado = output<void>();

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  readonly idModal = ID_MODAL_ARCHIVO;
  mensajeControl = mensajeControl;
  formatearTamano = formatearTamano;

  editando = signal<ArchivoImportado | null>(null);
  archivoForm = new FormGroup({
    titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    fo_tipo: new FormControl<number | null>(null, { validators: [Validators.required] }),
    fecha_documento: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    descripcion: new FormControl('', { nonNullable: true })
  });
  archivoSeleccionado = signal<File | null>(null);
  // Errores del cliente (archivo) y del API por campo; se muestran bajo cada campo.
  erroresCampo = signal<Record<string, string>>({});
  errorGeneral = signal<string | null>(null);
  guardando = signal(false);
  intentoFallido = signal(false);

  constructor() {
    effect(() => {
      const solicitud = this.solicitud();
      if (solicitud) {
        untracked(() => this.preparar(solicitud.archivo));
      }
    });
  }

  private preparar(archivo: ArchivoImportado | null): void {
    this.editando.set(archivo);
    this.erroresCampo.set({});
    this.errorGeneral.set(null);
    this.intentoFallido.set(false);
    this.archivoForm.reset({
      titulo: archivo?.titulo ?? '',
      fo_tipo: archivo?.fo_tipo ?? null,
      fecha_documento: archivo?.fecha_documento ?? aIso(new Date()),
      descripcion: archivo?.descripcion ?? ''
    });
    this.limpiarArchivo();
  }

  private limpiarArchivo(): void {
    this.archivoSeleccionado.set(null);
    const input = this.archivoInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
  }

  private ponerError(campo: string, mensaje: string | null): void {
    this.erroresCampo.update(errores => {
      const copia = { ...errores };
      if (mensaje) {
        copia[campo] = mensaje;
      } else {
        delete copia[campo];
      }
      return copia;
    });
  }

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    this.ponerError('archivo', null);

    if (archivo) {
      const problema = errorArchivoImportacion(archivo);
      if (problema) {
        this.limpiarArchivo();
        this.ponerError('archivo', problema);
        return;
      }
    }
    this.archivoSeleccionado.set(archivo);
  }

  guardar(): void {
    const edicion = this.editando();
    const archivo = this.archivoSeleccionado();
    this.errorGeneral.set(null);
    this.intentoFallido.set(false);

    if (this.archivoForm.invalid || (!edicion && !archivo)) {
      marcarInvalidos(this.archivoForm);
      if (!edicion && !archivo && !this.erroresCampo()['archivo']) {
        this.ponerError('archivo', 'Selecciona un archivo.');
      }
      this.intentoFallido.set(true);
      return;
    }

    const valores = this.archivoForm.getRawValue();
    const datos = {
      titulo: valores.titulo.trim(),
      descripcion: valores.descripcion.trim(),
      fo_tipo: valores.fo_tipo as number,
      fecha_documento: valores.fecha_documento
    };

    this.guardando.set(true);
    this.erroresCampo.set({});

    const peticion = edicion
      ? this.reportes.editarArchivo(edicion.id, datos)
      : this.reportes.importarArchivo({ ...datos, archivo: archivo as File });

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.limpiarArchivo();
        cerrarModal(ID_MODAL_ARCHIVO);
        this.guardado.emit();
      },
      error: error => {
        this.guardando.set(false);
        // El modal no se cierra: cada error 400 se muestra bajo su campo.
        const errores = erroresPorCampo(error, CAMPOS_API, 'No se pudo guardar el archivo.');
        this.erroresCampo.set(errores.porCampo);
        this.errorGeneral.set(errores.general);
      }
    });
  }

}
