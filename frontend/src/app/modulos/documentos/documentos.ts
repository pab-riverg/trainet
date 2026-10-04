import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DocumentosService } from '../../servicios/documentos';
import { ROLES_GESTION_DOCUMENTOS } from '../../modelos/permisos-documentos';
import { mensajeError } from '../../utilidades/errores';
import { Biblioteca } from './biblioteca/biblioteca';
import { Institucionales } from './institucionales/institucionales';
import { HistorialDocumentos } from './historial/historial';

interface Pestana {
  id: string;
  etiqueta: string;
}

@Component({
  selector: 'app-documentos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Biblioteca, Institucionales, HistorialDocumentos],
  templateUrl: './documentos.html',
  styleUrl: './documentos.css',
})
export class Documentos implements OnInit {

  private documentosService = inject(DocumentosService);

  cargando = signal(true);
  error = signal<string | null>(null);
  moduloId = signal<number | null>(null);

  private rolActual = signal(localStorage.getItem('trainet_rol'));

  pestanas = computed<Pestana[]>(() => {
    const lista: Pestana[] = [
      { id: 'biblioteca', etiqueta: 'Biblioteca' },
      { id: 'institucionales', etiqueta: 'Institucionales' }
    ];
    if (ROLES_GESTION_DOCUMENTOS.includes(this.rolActual() ?? '')) {
      lista.push({ id: 'historial', etiqueta: 'Historial' });
    }
    return lista;
  });

  pestanaActiva = signal<string>('biblioteca');

  ngOnInit(): void {
    this.documentosService.listarModuloDocumental().subscribe({
      next: modulos => {
        const primero = modulos[0];
        if (!primero) {
          this.error.set('El módulo de gestión documental no está configurado.');
          this.cargando.set(false);
          return;
        }
        this.moduloId.set(primero.id);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'El módulo de gestión documental no está configurado.'));
        this.cargando.set(false);
      }
    });
  }

  cambiarPestana(id: string): void {
    this.pestanaActiva.set(id);
  }

}
