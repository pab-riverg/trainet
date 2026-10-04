import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { Auth } from '../../servicios/auth';
import { InicioService } from '../../servicios/inicio';
import { MenuLateral } from '../../servicios/menu-lateral';
import { ModuloMenu, SeccionMenu } from '../../modelos/inicio';

/**
 * Umbral para agrupar módulos bajo el botón "Más". Se cuentan los módulos visibles que van en la barra
 * (todos los que declara el backend para el rol, salvo Ayuda, que está en el pie del menú).
 * Si el total SUPERA este número, los módulos de la sección 'mas' van dentro del grupo plegable "Más";
 * si no, se muestran directamente en la sección Gestión, tras los demás, sin botón "Más".
 */
export const UMBRAL_MODULOS_PARA_MAS = 10;

/** Un módulo es el de la ruta actual si la ruta es la suya o una subruta (ignora query y fragmento). */
function rutaPerteneceAlModulo(url: string, ruta: string): boolean {
  const camino = url.split(/[?#]/)[0];
  return camino === ruta || camino.startsWith(`${ruta}/`);
}

@Component({
  selector: 'app-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.html',
  styleUrl: './nav.css'
})
export class Nav {

  private auth = inject(Auth);
  private inicio = inject(InicioService);
  private router = inject(Router);
  private menu = inject(MenuLateral);
  private elemento = inject<ElementRef<HTMLElement>>(ElementRef);

  // El menú sale de los módulos que el backend declara visibles para el rol (agrupados por sección).
  private modulosDe(seccion: SeccionMenu): ModuloMenu[] {
    return this.inicio.modulos().filter(modulo => modulo.seccion === seccion);
  }

  principal = computed(() => this.modulosDe('principal'));
  // Ayuda va en el pie del menú, no en la sección Sistema.
  sistema = computed(() => this.modulosDe('sistema').filter(modulo => modulo.clave !== 'ayuda'));
  ayuda = computed(() => this.inicio.modulos().find(modulo => modulo.clave === 'ayuda') ?? null);

  // Módulos de la barra: todos los visibles menos Ayuda (que va en el pie).
  private totalEnBarra = computed(() => this.inicio.modulos().filter(modulo => modulo.clave !== 'ayuda').length);
  private agruparEnMas = computed(() => this.totalEnBarra() > UMBRAL_MODULOS_PARA_MAS);

  // Sin agrupar, los módulos de 'mas' se suman a Gestión, detrás de los demás.
  gestion = computed(() => {
    const gestion = this.modulosDe('gestion');
    return this.agruparEnMas() ? gestion : [...gestion, ...this.modulosDe('mas')];
  });
  // Módulos dentro del botón "Más" (vacío cuando no se agrupa).
  mas = computed(() => (this.agruparEnMas() ? this.modulosDe('mas') : []));

  // Ruta actual, actualizada en cada navegación terminada.
  private urlActual = signal(this.router.url);
  // Decisión manual del botón; se descarta en cada navegación para que el grupo siga a la ruta.
  private abiertoManual = signal<boolean | null>(null);
  private rutaEnMas = computed(() => this.mas().some(modulo => rutaPerteneceAlModulo(this.urlActual(), modulo.ruta)));

  // Arranca plegado; se despliega solo si la ruta es de un módulo del grupo (también al entrar por URL o con F5)
  // y se pliega al navegar fuera. El botón manda hasta la siguiente navegación.
  mostrarMas = computed(() => this.abiertoManual() ?? this.rutaEnMas());

  constructor() {
    // Usa lo guardado o lo carga si falta (por ejemplo, al recargar la página con la sesión abierta).
    this.inicio.cargar();

    this.router.events
      .pipe(
        filter((evento): evento is NavigationEnd => evento instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(evento => {
        this.urlActual.set(evento.urlAfterRedirects);
        this.abiertoManual.set(null);
      });

    // En móvil el menú es un panel: al abrirse, el foco pasa al primer enlace.
    effect(() => {
      if (this.menu.abierto()) {
        untracked(() => this.elemento.nativeElement.querySelector<HTMLElement>('a.sidebar-link')?.focus());
      }
    });
  }

  toggleMas(): void {
    this.abiertoManual.set(!this.mostrarMas());
  }

  // Pulsar cualquier enlace del menú cierra el panel (si la ruta es la misma no hay navegación y no lo cerraría el servicio).
  alPulsarMenu(evento: Event): void {
    if ((evento.target as Element).closest('a')) {
      this.menu.cerrar();
    }
  }

  alActivarCerrarSesion(evento: Event): void {
    evento.preventDefault();
    this.logout();
  }

  logout(): void {
    this.auth.logout();
  }

}
