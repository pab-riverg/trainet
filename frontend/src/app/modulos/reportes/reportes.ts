import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { sincronizarPestanaConVista } from '../../utilidades/rutas';
import { puedeGenerar, puedeGestionar, puedeImportar, puedeLeer, puedeVerArchivos } from '../../modelos/permisos-reportes';
import { ArchivosImportados } from './archivos/archivos';
import { DetalleInforme } from './detalle-informe/detalle-informe';
import { GenerarInforme } from './generar/generar';
import { HistorialInformes } from './historial/historial';

interface Pestana {
  id: 'archivos' | 'generar' | 'historial';
  etiqueta: string;
  icono: string;
}

@Component({
  selector: 'app-reportes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ArchivosImportados, GenerarInforme, HistorialInformes, DetalleInforme],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes {

  private rol = localStorage.getItem('trainet_rol') ?? '';

  tienePermiso = puedeLeer(this.rol);
  // Eliminar informes: solo el administrador.
  puedeGestionar = puedeGestionar(this.rol);
  // Importar y gestionar archivos propios (el directivo y el supervisor no importan).
  puedeImportar = puedeImportar(this.rol);

  // Cada rol ve solo las secciones que puede usar; el historial está siempre.
  pestanas = computed<Pestana[]>(() => {
    if (!this.tienePermiso) {
      return [];
    }
    const todas: (Pestana & { visible: boolean })[] = [
      { id: 'archivos', etiqueta: 'Archivos', icono: 'bi-folder2-open', visible: puedeVerArchivos(this.rol) },
      { id: 'generar', etiqueta: 'Generar informe', icono: 'bi-file-earmark-bar-graph', visible: puedeGenerar(this.rol) },
      { id: 'historial', etiqueta: 'Historial', icono: 'bi-clock-history', visible: true }
    ];
    return todas.filter(pestana => pestana.visible).map(({ id, etiqueta, icono }) => ({ id, etiqueta, icono }));
  });

  // La primera sección disponible para el rol.
  private primeraPestana: Pestana['id'] = this.pestanas()[0]?.id ?? 'historial';
  pestanaActiva = signal<Pestana['id']>(this.primeraPestana);

  // Informe abierto en la vista de detalle (reemplaza a las pestañas hasta pulsar "Volver").
  informeAbierto = signal<number | null>(null);
  private pestanaDeOrigen: Pestana['id'] = this.primeraPestana;

  // La URL (?vista=) y la pestaña activa se mantienen sincronizadas; también cierra un informe abierto.
  private actualizarVista = sincronizarPestanaConVista(
    () => this.pestanas().map(pestana => pestana.id),
    id => {
      const pestana = this.pestanas().find(item => item.id === id);
      if (pestana) {
        this.informeAbierto.set(null);
        this.pestanaActiva.set(pestana.id);
      }
    }
  );

  cambiarPestana(id: Pestana['id']): void {
    this.pestanaActiva.set(id);
    this.actualizarVista(id);
  }

  abrirInforme(id: number): void {
    this.pestanaDeOrigen = this.pestanaActiva();
    this.informeAbierto.set(id);
  }

  // Tras generar o consolidar, el historial es el lugar natural al volver.
  abrirInformeNuevo(id: number): void {
    this.abrirInforme(id);
    this.pestanaDeOrigen = 'historial';
  }

  cerrarInforme(): void {
    this.informeAbierto.set(null);
    this.cambiarPestana(this.pestanaDeOrigen);
  }

}
