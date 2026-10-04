import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { CategoriasAsistente } from './categorias/categorias';
import { ConsultasAsistente, PrecargaConsulta } from './consultas/consultas';

// Entrenamiento del asistente (solo administrador): preguntas frecuentes y categorías.
@Component({
  selector: 'app-entrenamiento-asistente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConsultasAsistente, CategoriasAsistente],
  template: `
    <div class="entrenamiento-subtabs" role="tablist" aria-label="Secciones del entrenamiento">
      <button type="button" role="tab" class="filter-btn"
              [class.active]="seccion() === 'preguntas'"
              [attr.aria-selected]="seccion() === 'preguntas'"
              (click)="seccion.set('preguntas')">
        <i class="bi bi-question-circle" aria-hidden="true"></i> Preguntas
      </button>
      <button type="button" role="tab" class="filter-btn"
              [class.active]="seccion() === 'categorias'"
              [attr.aria-selected]="seccion() === 'categorias'"
              (click)="seccion.set('categorias')">
        <i class="bi bi-tags" aria-hidden="true"></i> Categorías
      </button>
    </div>

    @if (seccion() === 'preguntas') {
      <app-consultas-asistente [precarga]="precarga()" />
    } @else {
      <app-categorias-asistente />
    }
  `,
  styles: `
    .entrenamiento-subtabs {
      display: flex;
      gap: .5rem;
      margin-bottom: 1rem;
    }

    .filter-btn.active {
      background: var(--accent);
      color: var(--white);
      border-color: var(--accent);
    }
  `,
})
export class EntrenamientoAsistente {

  precarga = input<PrecargaConsulta | null>(null);

  seccion = signal<'preguntas' | 'categorias'>('preguntas');

}
