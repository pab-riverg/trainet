import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdministracionService } from '../../../servicios/administracion';
import { PanelAdministracion } from '../../../modelos/administracion';
import { DESTINO_REQUISITO, formatearFechaIso, formatearNumero } from '../../../utilidades/administracion';
import { mensajeError } from '../../../utilidades/errores';

// Panel de resumen: cada requisito se gestiona en otro módulo, aquí solo se resume y se redirige.
@Component({
  selector: 'app-panel-administracion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './panel.html',
  styleUrl: './panel.css',
})
export class PanelAdministracionVista implements OnInit {

  private administracion = inject(AdministracionService);

  destino = DESTINO_REQUISITO;
  formatearFechaIso = formatearFechaIso;
  formatearNumero = formatearNumero;

  panel = signal<PanelAdministracion | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);

    this.administracion.obtenerPanel().subscribe({
      next: panel => {
        this.panel.set(panel);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'No se pudo cargar el panel de administración.'));
        this.cargando.set(false);
      }
    });
  }

}
