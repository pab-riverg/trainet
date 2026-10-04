import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RecursosService } from '../../servicios/recursos';
import { ROLES_GESTION_RECURSOS } from '../../modelos/permisos-recursos';
import { mensajeError } from '../../utilidades/errores';
import { sincronizarPestanaConVista } from '../../utilidades/rutas';
import { MisPedidos } from './mis-pedidos/mis-pedidos';
import { GestionPedidos } from './gestion/gestion';
import { CatalogoRecursos } from './catalogo/catalogo';

interface Pestana {
  id: string;
  etiqueta: string;
}

@Component({
  selector: 'app-recursos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MisPedidos, GestionPedidos, CatalogoRecursos],
  templateUrl: './recursos.html',
  styleUrl: './recursos.css',
})
export class Recursos implements OnInit {

  private recursosService = inject(RecursosService);

  cargando = signal(true);
  error = signal<string | null>(null);
  moduloId = signal<number | null>(null);

  private rolActual = signal(localStorage.getItem('trainet_rol'));

  pestanas = computed<Pestana[]>(() => {
    const lista: Pestana[] = [{ id: 'mis-pedidos', etiqueta: 'Solicitar y mis pedidos' }];
    if (ROLES_GESTION_RECURSOS.includes(this.rolActual() ?? '')) {
      lista.push({ id: 'gestion', etiqueta: 'Gestión de pedidos' });
      lista.push({ id: 'catalogo', etiqueta: 'Catálogo de recursos' });
    }
    return lista;
  });

  pestanaActiva = signal<string>('mis-pedidos');

  // La URL (?vista=) y la pestaña activa se mantienen sincronizadas; `actualizarVista` refleja el cambio manual.
  private actualizarVista = sincronizarPestanaConVista(() => this.pestanas().map(p => p.id), id => this.pestanaActiva.set(id));

  ngOnInit(): void {
    this.recursosService.listarModuloPedidos().subscribe({
      next: modulos => {
        const primero = modulos[0];
        if (!primero) {
          this.error.set('El módulo de pedidos de recursos no está configurado.');
          this.cargando.set(false);
          return;
        }
        this.moduloId.set(primero.id);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'El módulo de pedidos de recursos no está configurado.'));
        this.cargando.set(false);
      }
    });
  }

  cambiarPestana(id: string): void {
    this.pestanaActiva.set(id);
    this.actualizarVista(id);
  }

}
