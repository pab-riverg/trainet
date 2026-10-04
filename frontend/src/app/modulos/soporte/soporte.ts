import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { SoporteService } from '../../servicios/soporte';
import { ROLES_GESTION_TICKETS } from '../../modelos/permisos-soporte';
import { mensajeError } from '../../utilidades/errores';
import { sincronizarPestanaConVista } from '../../utilidades/rutas';
import { MisTickets } from './reportar/reportar';
import { GestionTickets } from './gestion/gestion';

interface Pestana {
  id: string;
  etiqueta: string;
}

@Component({
  selector: 'app-soporte',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MisTickets, GestionTickets],
  templateUrl: './soporte.html',
  styleUrl: './soporte.css',
})
export class Soporte implements OnInit {

  private soporteService = inject(SoporteService);

  cargando = signal(true);
  error = signal<string | null>(null);
  moduloId = signal<number | null>(null);

  private rolActual = signal(localStorage.getItem('trainet_rol'));

  pestanas = computed<Pestana[]>(() => {
    const lista: Pestana[] = [{ id: 'reportar', etiqueta: 'Reportar y mis tickets' }];
    if (ROLES_GESTION_TICKETS.includes(this.rolActual() ?? '')) {
      lista.push({ id: 'gestion', etiqueta: 'Gestión de tickets' });
    }
    return lista;
  });

  pestanaActiva = signal<string>('reportar');

  // La URL (?vista=) y la pestaña activa se mantienen sincronizadas; `actualizarVista` refleja el cambio manual.
  private actualizarVista = sincronizarPestanaConVista(() => this.pestanas().map(p => p.id), id => this.pestanaActiva.set(id));

  ngOnInit(): void {
    this.soporteService.listarModuloSoporte().subscribe({
      next: modulos => {
        const primero = modulos[0];
        if (!primero) {
          this.error.set('El módulo de soporte técnico no está configurado.');
          this.cargando.set(false);
          return;
        }
        this.moduloId.set(primero.id);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'El módulo de soporte técnico no está configurado.'));
        this.cargando.set(false);
      }
    });
  }

  cambiarPestana(id: string): void {
    this.pestanaActiva.set(id);
    this.actualizarVista(id);
  }

}
