import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { EMPTY, Subject, catchError, debounceTime, merge, switchMap, tap } from 'rxjs';
import { AdministracionService } from '../../../servicios/administracion';
import { CatalogoAuditoria, EventoAuditoria } from '../../../modelos/administracion';
import { formatearFechaHora } from '../../../utilidades/administracion';
import { mensajeError } from '../../../utilidades/errores';
import { EstadoBadge } from '../../../compartidos/estado-badge/estado-badge';
import { Paginador } from '../../../compartidos/paginador/paginador';
import { TAMANO_PAGINA_DEFECTO, ajustarPagina } from '../../../utilidades/paginacion';

@Component({
  selector: 'app-bitacora',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, EstadoBadge, Paginador],
  templateUrl: './bitacora.html',
})
export class Bitacora implements OnInit {

  private administracion = inject(AdministracionService);

  formatearFechaHora = formatearFechaHora;

  eventos = signal<EventoAuditoria[]>([]);
  total = signal(0);
  cargando = signal(false);
  error = signal<string | null>(null);
  catalogo = signal<CatalogoAuditoria>({ acciones: [], modulos: [] });
  errorCatalogo = signal<string | null>(null);

  // Paginación de servidor: se pide solo la página visible (limit = 10, offset = (pagina - 1) * 10).
  pagina = signal(1);

  filtrosForm = new FormGroup({
    accion: new FormControl('', { nonNullable: true }),
    modulo: new FormControl('', { nonNullable: true }),
    desde: new FormControl('', { nonNullable: true }),
    hasta: new FormControl('', { nonNullable: true }),
    search: new FormControl('', { nonNullable: true })
  });
  errorFechas = signal<string | null>(null);

  // Cada consulta cancela la anterior para que una respuesta lenta no pise a la más reciente.
  private consulta$ = new Subject<void>();

  constructor() {
    this.consulta$
      .pipe(
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap(() => this.administracion.listarAuditoria(this.filtrosActuales()).pipe(
          catchError(error => {
            this.error.set(mensajeError(error, 'No se pudo cargar la bitácora.'));
            this.cargando.set(false);
            return EMPTY;
          })
        )),
        takeUntilDestroyed()
      )
      .subscribe(respuesta => {
        this.total.set(respuesta.count);
        const valida = ajustarPagina(this.pagina(), respuesta.count);
        if (valida !== this.pagina()) {
          // La página pedida ya no existe (por ejemplo, tras cambiar los datos): se pide la última válida.
          this.pagina.set(valida);
          this.consultar();
          return;
        }
        this.eventos.set(respuesta.results);
        this.cargando.set(false);
      });

    const c = this.filtrosForm.controls;
    // Cualquier filtro vuelve a la primera página; el texto espera una pausa antes de consultar.
    merge(
      c.accion.valueChanges, c.modulo.valueChanges, c.desde.valueChanges, c.hasta.valueChanges,
      c.search.valueChanges.pipe(debounceTime(400))
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.pagina.set(1);
        this.consultar();
      });
  }

  ngOnInit(): void {
    this.consultar();
    this.administracion.listarCatalogoAuditoria().subscribe({
      next: catalogo => this.catalogo.set(catalogo),
      error: error => this.errorCatalogo.set(mensajeError(error, 'No se pudieron cargar las opciones de los filtros.'))
    });
  }

  private filtrosActuales() {
    const v = this.filtrosForm.getRawValue();
    return {
      accion: v.accion || undefined,
      modulo: v.modulo || undefined,
      desde: v.desde || undefined,
      hasta: v.hasta || undefined,
      search: v.search.trim() || undefined,
      limit: TAMANO_PAGINA_DEFECTO,
      offset: (this.pagina() - 1) * TAMANO_PAGINA_DEFECTO
    };
  }

  // Valida desde ≤ hasta en el cliente antes de consultar.
  consultar(): void {
    const { desde, hasta } = this.filtrosForm.getRawValue();
    if (desde && hasta && desde > hasta) {
      this.errorFechas.set('La fecha inicial no puede ser posterior a la final.');
      return;
    }
    this.errorFechas.set(null);
    this.consulta$.next();
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ accion: '', modulo: '', desde: '', hasta: '', search: '' });
  }

  irAPagina(pagina: number): void {
    this.pagina.set(pagina);
    this.consultar();
  }

}
