import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../servicios/dashboard';
import { InicioService } from '../../servicios/inicio';
import { ContenidoDashboard } from '../../modelos/dashboard';
import { ContenidoInforme } from '../../compartidos/contenido-informe/contenido-informe';
import { MAX_DIAS_RANGO, diasDelRango } from '../../utilidades/reportes';
import { mensajeError } from '../../utilidades/errores';

// Dashboard gerencial: muestra el consolidado general (mismo `contenido` que un informe) para un periodo opcional.
// El acceso lo restringen el guard de rutas y el backend (administrador y directivo).
@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, ContenidoInforme],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {

  private dashboard = inject(DashboardService);
  private inicio = inject(InicioService);

  contenido = signal<ContenidoDashboard | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  // El enlace a Reportes solo se ofrece a quien tenga ese módulo.
  puedeVerReportes = computed(() => this.inicio.modulos().some(modulo => modulo.clave === 'reportes'));

  periodoForm = new FormGroup({
    desde: new FormControl('', { nonNullable: true }),
    hasta: new FormControl('', { nonNullable: true })
  });
  errorPeriodo = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  /** Aplica el periodo escrito (con validación) y recarga. */
  aplicar(): void {
    const { desde, hasta } = this.periodoForm.getRawValue();
    const problema = this.validarPeriodo(desde, hasta);
    this.errorPeriodo.set(problema);
    if (!problema) {
      this.cargar();
    }
  }

  limpiar(): void {
    this.periodoForm.reset({ desde: '', hasta: '' });
    this.errorPeriodo.set(null);
    this.cargar();
  }

  cargar(): void {
    const { desde, hasta } = this.periodoForm.getRawValue();
    this.cargando.set(true);
    this.error.set(null);

    this.dashboard.obtener({ desde: desde || undefined, hasta: hasta || undefined }).subscribe({
      next: contenido => {
        this.contenido.set(contenido);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudieron cargar los indicadores.'));
        this.cargando.set(false);
      }
    });
  }

  // Fechas opcionales; si vienen las dos, desde ≤ hasta y máximo 366 días (como valida el API).
  private validarPeriodo(desde: string, hasta: string): string | null {
    if (desde && hasta && desde > hasta) {
      return 'La fecha inicial no puede ser posterior a la final.';
    }
    if (desde && hasta && diasDelRango(desde, hasta) > MAX_DIAS_RANGO) {
      return `El rango máximo es de ${MAX_DIAS_RANGO} días.`;
    }
    return null;
  }

}
