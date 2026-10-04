import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, of, startWith, switchMap, tap } from 'rxjs';
import { ProveedoresService } from '../../../servicios/proveedores';
import { ContratoProveedor, Proveedor } from '../../../modelos/proveedores';
import { ROLES_APROBACION_ACUERDOS, ROLES_GESTION_PROVEEDORES } from '../../../modelos/permisos-proveedores';
import { ESTADOS_CONTRATO, etiquetaEstadoContrato } from '../../../utilidades/proveedores';
import { guardarBlob, nombreDeArchivo } from '../../../utilidades/archivos';
import { cerrarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { marcarInvalidos, mensajeControl } from '../../../utilidades/formularios';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

const LIMITE_TAMANO_ARCHIVO = 10 * 1024 * 1024;
const EXTENSIONES_ACUERDO = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];

@Component({
  selector: 'app-acuerdos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, BotonAccion, EstadoBadge, Paginador],
  templateUrl: './acuerdos.html',
  styleUrl: './acuerdos.css',
})
export class Acuerdos implements OnInit {

  mensajeControl = mensajeControl;

  private proveedoresService = inject(ProveedoresService);

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  estados = ESTADOS_CONTRATO;
  etiquetaEstado = etiquetaEstadoContrato;

  contratos = signal<ContratoProveedor[]>([]);
  paginacion = crearPaginacion(() => this.contratos());
  cargando = signal(false);
  error = signal<string | null>(null);

  proveedores = signal<Proveedor[]>([]);
  errorProveedores = signal<string | null>(null);

  filtroEstado = new FormControl<string | null>(null);

  acuerdoForm = new FormGroup({
    fo_proveedor: new FormControl<number | null>(null, { validators: [Validators.required] }),
    descripcion: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] }),
    fecha_inicio: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    fecha_fin: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    confirmacion: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] })
  });
  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  enviando = signal(false);
  errorEnvio = signal<string | null>(null);
  exitoEnvio = signal<string | null>(null);

  accionEnCurso = signal<number | null>(null);
  errorAccion = signal<string | null>(null);

  contratoPorEliminar = signal<number | null>(null);
  contratoARechazar = signal<ContratoProveedor | null>(null);
  motivoControl = new FormControl('', { nonNullable: true, validators: [Validators.maxLength(1000)] });
  rechazando = signal(false);
  errorRechazo = signal<string | null>(null);

  puedeGestionar = computed(() => ROLES_GESTION_PROVEEDORES.includes(localStorage.getItem('trainet_rol') ?? ''));
  puedeAprobar = computed(() => ROLES_APROBACION_ACUERDOS.includes(localStorage.getItem('trainet_rol') ?? ''));

  proveedorElegido = computed(() => {
    const id = this.proveedorElegidoId();
    return this.proveedores().find(p => p.id === id) ?? null;
  });
  private proveedorElegidoId = signal<number | null>(null);

  constructor() {
    // Cambiar un filtro o la selección vuelve a la primera página.
    this.filtroEstado.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
    this.filtroEstado.valueChanges
      .pipe(
        startWith(this.filtroEstado.value),
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(estado => this.proveedoresService.listarContratos({ estado: estado ?? undefined }).pipe(
          catchError(error => {
            this.error.set(mensajeError(error, 'No se pudo cargar la lista de acuerdos.'));
            return of(null);
          })
        )),
        takeUntilDestroyed()
      )
      .subscribe({
        next: contratos => {
          if (contratos) {
            this.contratos.set(contratos);
          }
          this.cargando.set(false);
        },
        error: error => {
          this.error.set(mensajeError(error, 'No se pudo cargar la lista de acuerdos.'));
          this.cargando.set(false);
        }
      });

    this.acuerdoForm.controls.fo_proveedor.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(id => this.proveedorElegidoId.set(id));
  }

  ngOnInit(): void {
    this.proveedoresService.listarProveedores().subscribe({
      next: proveedores => this.proveedores.set(proveedores),
      error: error => this.errorProveedores.set(mensajeError(error, 'No se pudo cargar la lista de proveedores.'))
    });
  }

  recargar(): void {
    this.filtroEstado.setValue(this.filtroEstado.value);
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
      if (!EXTENSIONES_ACUERDO.includes(extension)) {
        this.errorArchivo.set('Tipo de archivo no permitido. Usa PDF, Word o imagen (.png, .jpg).');
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

  registrar(): void {
    if (this.acuerdoForm.invalid) {
      marcarInvalidos(this.acuerdoForm);
      return;
    }

    const valores = this.acuerdoForm.getRawValue();
    if (this.acuerdoForm.invalid || valores.fo_proveedor === null) {
      return;
    }

    if (valores.fecha_fin < valores.fecha_inicio) {
      this.errorEnvio.set('La fecha de fin no puede ser anterior a la fecha de inicio.');
      this.exitoEnvio.set(null);
      return;
    }

    this.enviando.set(true);
    this.errorEnvio.set(null);
    this.exitoEnvio.set(null);

    this.proveedoresService.crearContrato({
      fo_proveedor: valores.fo_proveedor,
      descripcion: valores.descripcion.trim(),
      fecha_inicio: valores.fecha_inicio,
      fecha_fin: valores.fecha_fin,
      confirmacion: valores.confirmacion.trim()
    }, this.archivoSeleccionado() ?? undefined).subscribe({
      next: () => {
        this.enviando.set(false);
        this.exitoEnvio.set('Acuerdo registrado. Queda pendiente de aprobación por un directivo o administrador.');
        this.acuerdoForm.reset({ fo_proveedor: null, descripcion: '', fecha_inicio: '', fecha_fin: '', confirmacion: '' });
        this.limpiarArchivo();
        this.recargar();
      },
      error: error => {
        this.enviando.set(false);
        this.errorEnvio.set(mensajeError(error, 'No se pudo registrar el acuerdo.'));
      }
    });
  }

  // Solo un acuerdo vigente puede finalizarse o cancelarse (lo valida también el backend).
  cerrarAcuerdo(contrato: ContratoProveedor, estado: 'finalizado' | 'cancelado'): void {
    this.errorAccion.set(null);
    this.accionEnCurso.set(contrato.id);

    this.proveedoresService.actualizarContrato(contrato.id, { estado }).subscribe({
      next: () => {
        this.accionEnCurso.set(null);
        this.recargar();
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo actualizar el estado del acuerdo.'));
      }
    });
  }

  pedirEliminar(contrato: ContratoProveedor): void {
    this.contratoPorEliminar.set(contrato.id);
  }

  cancelarEliminar(): void {
    this.contratoPorEliminar.set(null);
  }

  // Solo se eliminan acuerdos pendientes o rechazados (lo valida también el backend).
  confirmarEliminar(contrato: ContratoProveedor): void {
    this.errorAccion.set(null);
    this.accionEnCurso.set(contrato.id);

    this.proveedoresService.eliminarContrato(contrato.id).subscribe({
      next: () => {
        this.accionEnCurso.set(null);
        this.contratoPorEliminar.set(null);
        this.recargar();
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.contratoPorEliminar.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo eliminar el acuerdo.'));
      }
    });
  }

  aprobar(contrato: ContratoProveedor): void {
    this.errorAccion.set(null);
    this.accionEnCurso.set(contrato.id);

    this.proveedoresService.decidirContrato(contrato.id, { estado: 'aprobado' }).subscribe({
      next: () => {
        this.accionEnCurso.set(null);
        this.recargar();
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo aprobar el acuerdo.'));
      }
    });
  }

  abrirRechazo(contrato: ContratoProveedor): void {
    this.contratoARechazar.set(contrato);
    this.errorRechazo.set(null);
    this.motivoControl.reset('');
  }

  confirmarRechazo(): void {
    const contrato = this.contratoARechazar();
    const motivo = this.motivoControl.value.trim();
    if (!contrato) {
      return;
    }
    if (!motivo) {
      this.errorRechazo.set('El motivo es obligatorio para rechazar un acuerdo.');
      return;
    }

    this.rechazando.set(true);
    this.errorRechazo.set(null);

    this.proveedoresService.decidirContrato(contrato.id, { estado: 'rechazado', motivo }).subscribe({
      next: () => {
        this.rechazando.set(false);
        cerrarModal('modalRechazarAcuerdo');
        this.recargar();
      },
      error: error => {
        this.rechazando.set(false);
        this.errorRechazo.set(mensajeError(error, 'No se pudo rechazar el acuerdo.'));
      }
    });
  }

  descargarCotizacion(contrato: ContratoProveedor): void {
    if (!contrato.fo_cotizacion) {
      return;
    }

    this.errorAccion.set(null);
    this.accionEnCurso.set(contrato.id);

    this.proveedoresService.descargarCotizacion(contrato.fo_cotizacion).subscribe({
      next: blob => {
        this.accionEnCurso.set(null);
        guardarBlob(blob, nombreDeArchivo(contrato.cotizacion_archivo ?? '') || `cotizacion-${contrato.fo_cotizacion}`);
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo descargar la cotización.'));
      }
    });
  }

  descargar(contrato: ContratoProveedor): void {
    if (!contrato.archivo) {
      return;
    }

    this.errorAccion.set(null);
    this.accionEnCurso.set(contrato.id);

    this.proveedoresService.descargarContrato(contrato.id).subscribe({
      next: blob => {
        this.accionEnCurso.set(null);
        guardarBlob(blob, nombreDeArchivo(contrato.archivo ?? '') || `acuerdo-${contrato.id}`);
      },
      error: error => {
        this.accionEnCurso.set(null);
        this.errorAccion.set(mensajeError(error, 'No se pudo descargar el archivo del acuerdo.'));
      }
    });
  }

}
