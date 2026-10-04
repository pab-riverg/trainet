import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { CatalogoArticulos } from './articulos/articulos';
import { CatalogoCategorias } from './categorias/categorias';

@Component({
  selector: 'app-catalogo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CatalogoArticulos, CatalogoCategorias],
  template: `
    <div class="catalogo-subtabs" role="tablist" aria-label="Secciones del catálogo">
      <button type="button" role="tab" class="filter-btn"
              [class.active]="seccion() === 'articulos'"
              [attr.aria-selected]="seccion() === 'articulos'"
              (click)="seccion.set('articulos')">
        <i class="bi bi-box-seam" aria-hidden="true"></i> Artículos
      </button>
      <button type="button" role="tab" class="filter-btn"
              [class.active]="seccion() === 'categorias'"
              [attr.aria-selected]="seccion() === 'categorias'"
              (click)="seccion.set('categorias')">
        <i class="bi bi-tags" aria-hidden="true"></i> Categorías
      </button>
    </div>

    @if (seccion() === 'articulos') {
      <app-catalogo-articulos [moduloId]="moduloId()" />
    } @else {
      <app-catalogo-categorias />
    }
  `,
  styles: `
    .catalogo-subtabs {
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
export class Catalogo {

  moduloId = input.required<number>();

  seccion = signal<'articulos' | 'categorias'>('articulos');

}
