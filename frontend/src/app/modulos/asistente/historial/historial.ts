import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { AsistenteService } from '../../../servicios/asistente';
import { FiltrosHistorial, HistorialConsulta } from '../../../modelos/asistente';
import { etiquetaResuelta, etiquetaUtil } from '../../../utilidades/asistente';
import { mensajeError } from '../../../utilidades/errores';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { crearPaginacion } from '../../../utilidades/paginacion';


// Historial de consultas: "propio" (cada usuario) o "global" (administrador, con filtros).
@Component({
  selector: 'app-historial-asistente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, EstadoBadge, Paginador],
  templateUrl: './historial.html',
})
export class HistorialAsistente implements OnInit {

  private asistente = inject(AsistenteService);

  modo = input<'propio' | 'global'>('propio');

  etiquetaResuelta = etiquetaResuelta;
  etiquetaUtil = etiquetaUtil;

  private idActual = Number(localStorage.getItem('trainet_id'));

  filas = signal<HistorialConsulta[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);

  // Usuarios conocidos para el filtro; se acumulan para no perder opciones al filtrar.
  private usuariosConocidos = signal<Map<number, string>>(new Map());
  usuarios = computed(() =>
    [...this.usuariosConocidos().entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre))
  );

  filtrosForm = new FormGroup({
    resuelta: new FormControl<'' | 'true' | 'false'>('', { nonNullable: true }),
    util: new FormControl<'' | 'true' | 'false'>('', { nonNullable: true }),
    usuario: new FormControl<number | null>(null),
    search: new FormControl('', { nonNullable: true })
  });

  paginacion = crearPaginacion(() => this.filas());

  constructor() {
    this.filtrosForm.valueChanges
      .pipe(debounceTime(300), takeUntilDestroyed())
      .subscribe(() => this.cargar());
    // La página vuelve a la primera en cuanto cambia un filtro (la recarga espera la pausa de escritura).
    this.filtrosForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.paginacion.reiniciar());
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.asistente.listarHistorial(this.modo() === 'global' ? this.filtros() : undefined).subscribe({
      next: filas => {
        // El administrador también recibe todo el historial en "propio": se muestran solo sus filas.
        this.filas.set(this.modo() === 'propio' ? filas.filter(fila => fila.fo_usuario === this.idActual) : filas);
        this.recordarUsuarios(filas);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudo cargar el historial.'));
        this.cargando.set(false);
      }
    });
  }

  private filtros(): FiltrosHistorial {
    const valores = this.filtrosForm.getRawValue();
    return {
      resuelta: valores.resuelta ? valores.resuelta === 'true' : undefined,
      util: valores.util ? valores.util === 'true' : undefined,
      usuario: valores.usuario ?? undefined,
      search: valores.search.trim() || undefined
    };
  }

  private recordarUsuarios(filas: HistorialConsulta[]): void {
    const mapa = new Map(this.usuariosConocidos());
    for (const fila of filas) {
      mapa.set(fila.fo_usuario, fila.usuario_nombre);
    }
    this.usuariosConocidos.set(mapa);
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ resuelta: '', util: '', usuario: null, search: '' });
  }

}
