import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { puedeEntrenar } from '../../modelos/permisos-asistente';
import { ChatTriny } from '../asistente/chat/chat-triny';
import { HistorialAsistente } from '../asistente/historial/historial';
import { EntrenamientoAsistente } from '../asistente/entrenamiento/entrenamiento';
import { PrecargaConsulta } from '../asistente/entrenamiento/consultas/consultas';
import { SinRespuesta } from '../asistente/sin-respuesta/sin-respuesta';
import { seguirAltoVisible } from '../../utilidades/alto-visible';

interface Pestana {
  id: string;
  etiqueta: string;
  icono: string;
}

@Component({
  selector: 'app-triny-ai',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatTriny, HistorialAsistente, EntrenamientoAsistente, SinRespuesta],
  templateUrl: './triny-ai.html',
  styleUrl: './triny-ai.css',
})
export class TrinyAi {

  private rol = localStorage.getItem('trainet_rol') ?? '';
  private documento = inject(DOCUMENT);

  constructor() {
    // Solo mientras se ve el chat: sigue el alto visible (teclado en iOS) y lo libera al cambiar de pestaña o salir.
    effect(onCleanup => {
      if (this.pestanaActiva() === 'asistente') {
        onCleanup(seguirAltoVisible(this.documento));
      }
    });
  }

  // Todos ven el chat y su historial; el administrador además entrena y revisa lo que no se respondió.
  pestanas = computed<Pestana[]>(() => {
    const lista: Pestana[] = [
      { id: 'asistente', etiqueta: 'Asistente', icono: 'bi-robot' },
      { id: 'historial', etiqueta: 'Mi historial', icono: 'bi-clock-history' }
    ];
    if (puedeEntrenar(this.rol)) {
      lista.push(
        { id: 'entrenamiento', etiqueta: 'Entrenamiento', icono: 'bi-mortarboard' },
        { id: 'global', etiqueta: 'Historial global', icono: 'bi-people' },
        { id: 'sin-respuesta', etiqueta: 'Sin respuesta', icono: 'bi-question-diamond' }
      );
    }
    return lista;
  });

  pestanaActiva = signal('asistente');

  precarga = signal<PrecargaConsulta | null>(null);
  private contadorPrecarga = 0;

  cambiarPestana(id: string): void {
    this.pestanaActiva.set(id);
  }

  // Desde "Sin respuesta": abre Entrenamiento con el texto como pregunta nueva.
  entrenar(texto: string): void {
    this.precarga.set({ texto, n: ++this.contadorPrecarga });
    this.pestanaActiva.set('entrenamiento');
  }

}
