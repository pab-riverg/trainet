import { ChangeDetectionStrategy, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, switchMap, tap } from 'rxjs';
import { CapacitacionService } from '../../../servicios/capacitacion';
import { Curso, MaterialEducativo } from '../../../modelos/capacitacion';
import { ROLES_GESTION_CURSOS } from '../../../modelos/permisos-capacitacion';
import { cerrarModal } from '../../../utilidades/modal';
import { mensajeError } from '../../../utilidades/errores';
import { BotonAccion } from '../../../compartidos/boton-accion/boton-accion';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';

const LIMITE_TAMANO_ARCHIVO = 10 * 1024 * 1024;

@Component({
  selector: 'app-materiales',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, BotonAccion, Paginador],
  templateUrl: './materiales.html'
})
export class Materiales implements OnInit {

  private capacitacionService = inject(CapacitacionService);

  archivoInput = viewChild<ElementRef<HTMLInputElement>>('archivoInput');

  cursos = signal<Curso[]>([]);
  errorCursos = signal<string | null>(null);
  cursoSeleccionado = new FormControl<number | null>(null);

  materiales = signal<MaterialEducativo[]>([]);
  paginacion = crearPaginacion(() => this.materiales());
  cargandoMateriales = signal(false);
  errorMateriales = signal<string | null>(null);

  tituloControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(255)] });
  archivoSeleccionado = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  subiendo = signal(false);
  errorSubida = signal<string | null>(null);

  materialAEliminar = signal<MaterialEducativo | null>(null);
  eliminando = signal(false);
  errorEliminar = signal<string | null>(null);

  private rolActual = signal(localStorage.getItem('trainet_rol'));
  puedeGestionar = computed(() => ROLES_GESTION_CURSOS.includes(this.rolActual() ?? ''));

  constructor() {
    // Cambiar un filtro o la selección vuelve a la primera página.
    this.cursoSeleccionado.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
    this.cursoSeleccionado.valueChanges
      .pipe(
        tap(() => this.limpiarFormularioSubida()),
        switchMap(id => {
          if (id === null) {
            this.materiales.set([]);
            this.errorMateriales.set(null);
            this.cargandoMateriales.set(false);
            return EMPTY;
          }
          this.cargandoMateriales.set(true);
          this.errorMateriales.set(null);
          return this.capacitacionService.listarMateriales(id);
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: materiales => {
          this.materiales.set(materiales);
          this.cargandoMateriales.set(false);
        },
        error: error => {
          this.errorMateriales.set(mensajeError(error, 'No se pudo cargar la lista de materiales.'));
          this.cargandoMateriales.set(false);
        }
      });
  }

  ngOnInit(): void {
    this.cargarCursos();
  }

  cargarCursos(): void {
    this.capacitacionService.listarCursos().subscribe({
      next: cursos => this.cursos.set(cursos),
      error: error => this.errorCursos.set(mensajeError(error, 'No se pudieron cargar los cursos.'))
    });
  }

  private recargarMaterialesActual(): void {
    const id = this.cursoSeleccionado.value;
    this.cursoSeleccionado.setValue(id);
  }

  private limpiarFormularioSubida(): void {
    this.tituloControl.reset('');
    this.errorSubida.set(null);
    this.limpiarArchivo();
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

    if (archivo && archivo.size > LIMITE_TAMANO_ARCHIVO) {
      this.errorArchivo.set('El archivo supera el límite de 10 MB.');
      this.limpiarArchivo();
      return;
    }

    this.archivoSeleccionado.set(archivo);
  }

  subir(): void {
    const idCurso = this.cursoSeleccionado.value;
    const archivo = this.archivoSeleccionado();
    if (idCurso === null || !archivo || this.tituloControl.invalid) {
      return;
    }

    this.subiendo.set(true);
    this.errorSubida.set(null);

    this.capacitacionService.subirMaterial(this.tituloControl.value, archivo, idCurso).subscribe({
      next: () => {
        this.subiendo.set(false);
        this.tituloControl.reset('');
        this.limpiarArchivo();
        this.recargarMaterialesActual();
      },
      error: error => {
        this.subiendo.set(false);
        this.errorSubida.set(mensajeError(error, 'No se pudo subir el material.'));
      }
    });
  }

  abrirEliminar(material: MaterialEducativo): void {
    this.materialAEliminar.set(material);
    this.errorEliminar.set(null);
  }

  confirmarEliminar(): void {
    const material = this.materialAEliminar();
    if (!material) {
      return;
    }

    this.eliminando.set(true);
    this.errorEliminar.set(null);

    this.capacitacionService.eliminarMaterial(material.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        cerrarModal('modalEliminarMaterial');
        this.recargarMaterialesActual();
      },
      error: error => {
        this.eliminando.set(false);
        this.errorEliminar.set(mensajeError(error, 'No se pudo eliminar el material.'));
      }
    });
  }

}
