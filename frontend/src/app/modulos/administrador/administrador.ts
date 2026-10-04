import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { puedeAdministrar } from '../../modelos/permisos-administracion';
import { Bitacora } from './bitacora/bitacora';
import { ConfiguracionSistema } from './configuracion/configuracion';
import { PanelAdministracionVista } from './panel/panel';

interface Pestana {
  id: 'panel' | 'configuracion' | 'bitacora';
  etiqueta: string;
  icono: string;
}

const PESTANAS: readonly Pestana[] = [
  { id: 'panel', etiqueta: 'Panel', icono: 'bi-speedometer2' },
  { id: 'configuracion', etiqueta: 'Configuración', icono: 'bi-gear' },
  { id: 'bitacora', etiqueta: 'Bitácora', icono: 'bi-journal-text' }
];

@Component({
  selector: 'app-administrador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PanelAdministracionVista, ConfiguracionSistema, Bitacora],
  templateUrl: './administrador.html',
  styleUrl: './administrador.css',
})
export class Administrador {

  // Solo el administrador; el resto de roles ve el mensaje de falta de permiso.
  tienePermiso = puedeAdministrar(localStorage.getItem('trainet_rol'));

  pestanas = PESTANAS;
  pestanaActiva = signal<Pestana['id']>('panel');

  cambiarPestana(id: Pestana['id']): void {
    this.pestanaActiva.set(id);
  }

}
