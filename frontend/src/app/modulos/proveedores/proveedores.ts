import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ProveedoresService } from '../../servicios/proveedores';
import { mensajeError } from '../../utilidades/errores';
import { sincronizarPestanaConVista } from '../../utilidades/rutas';
import { Directorio } from './directorio/directorio';
import { Necesidades } from './necesidades/necesidades';
import { Acuerdos } from './acuerdos/acuerdos';

interface Pestana {
  id: string;
  etiqueta: string;
}

@Component({
  selector: 'app-proveedores',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Directorio, Necesidades, Acuerdos],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.css',
})
export class Proveedores implements OnInit {

  private proveedoresService = inject(ProveedoresService);

  cargando = signal(true);
  error = signal<string | null>(null);
  moduloId = signal<number | null>(null);

  pestanas: Pestana[] = [
    { id: 'directorio', etiqueta: 'Directorio' },
    { id: 'necesidades', etiqueta: 'Necesidades de capacitación' },
    { id: 'acuerdos', etiqueta: 'Acuerdos' }
  ];

  pestanaActiva = signal<string>('directorio');

  // La URL (?vista=) y la pestaña activa se mantienen sincronizadas; `actualizarVista` refleja el cambio manual.
  private actualizarVista = sincronizarPestanaConVista(() => this.pestanas.map(p => p.id), id => this.pestanaActiva.set(id));

  ngOnInit(): void {
    this.proveedoresService.listarModuloProveedores().subscribe({
      next: modulos => {
        const primero = modulos[0];
        if (!primero) {
          this.error.set('El módulo de gestión de proveedores no está configurado.');
          this.cargando.set(false);
          return;
        }
        this.moduloId.set(primero.id);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'El módulo de gestión de proveedores no está configurado.'));
        this.cargando.set(false);
      }
    });
  }

  cambiarPestana(id: string): void {
    this.pestanaActiva.set(id);
    this.actualizarVista(id);
  }

}
