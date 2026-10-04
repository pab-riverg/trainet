import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DominioEstado, VarianteEstado, textoEstado, varianteEstado } from '../../utilidades/estados';

/**
 * Insignia de estado única de la aplicación: píldora suave, siempre con texto.
 * La variante sale del mapa de `utilidades/estados.ts` según el dominio y el valor; `variante` la fuerza
 * (por ejemplo, etiquetas de categoría o tipo). `etiqueta` permite mostrar un texto distinto del valor
 * (por ejemplo el nombre legible de un código del API); sin ella se muestra el valor normalizado.
 */
@Component({
  selector: 'app-estado-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span class="estado" [class]="clase()">{{ texto() }}</span>',
  styleUrl: './estado-badge.css',
})
export class EstadoBadge {

  valor = input<string | null | undefined>('');
  dominio = input<DominioEstado>('general');
  etiqueta = input<string | null>(null);
  variante = input<VarianteEstado | null>(null);

  texto = computed(() => textoEstado(this.etiqueta() ?? this.valor()));
  clase = computed(() => `estado-${this.variante() ?? varianteEstado(this.dominio(), this.valor())}`);

}
