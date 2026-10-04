import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ModuloMenu } from '../../modelos/inicio';
import { InicioService } from '../../servicios/inicio';

/** Máximo de atajos de la barra inferior móvil. */
export const MAX_ATAJOS_BARRA = 5;

/**
 * Barra inferior de navegación móvil (< 768px, ver styles.css). Se construye con los módulos que el backend declara
 * visibles para el rol: Inicio primero y Triny AI en el centro (identificados por clave); el resto de huecos se llenan con
 * los demás módulos de 'principal' y luego 'gestion', en el orden del registro. El panel lateral solo se abre con la
 * hamburguesa del topbar.
 */
@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './footer.html',
  styleUrl: './footer.css'
})
export class Footer {

  private inicio = inject(InicioService);

  atajos = computed<ModuloMenu[]>(() => {
    const candidatos = this.inicio.modulos().filter(modulo => modulo.seccion === 'principal' || modulo.seccion === 'gestion');
    const inicio = candidatos.find(modulo => modulo.clave === 'inicio');
    const triny = candidatos.find(modulo => modulo.clave === 'triny');
    const otros = candidatos.filter(modulo => modulo !== inicio && modulo !== triny);

    // Con Triny: Inicio, otro, Triny, otro, otro. Con menos módulos, Triny queda en el centro de la lista resultante.
    const cantidadOtros = Math.min(otros.length, MAX_ATAJOS_BARRA - (inicio ? 1 : 0) - (triny ? 1 : 0));
    const elegidos = otros.slice(0, cantidadOtros);
    const total = (inicio ? 1 : 0) + (triny ? 1 : 0) + elegidos.length;
    const posicionTriny = Math.floor(total / 2);

    const resultado: ModuloMenu[] = elegidos;
    if (inicio) {
      resultado.unshift(inicio);
    }
    if (triny) {
      resultado.splice(Math.min(posicionTriny, resultado.length), 0, triny);
    }
    return resultado;
  });

}
