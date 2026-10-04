import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ComprasService } from '../../servicios/compras';
import { CarritoService } from '../../servicios/carrito';
import {
  ROLES_GESTION_COMPRAS,
  ROLES_SOLICITUD_COMPRAS,
  ROLES_VER_TODAS_SOLICITUDES,
  ROLES_VISTA_COMPRAS
} from '../../modelos/permisos-compras';
import { mensajeError } from '../../utilidades/errores';
import { sincronizarPestanaConVista } from '../../utilidades/rutas';
import { Tienda } from './tienda/tienda';
import { Carrito } from './carrito/carrito';
import { ListaSolicitudes } from './solicitudes/solicitudes';
import { Catalogo } from './catalogo/catalogo';

interface Pestana {
  id: string;
  etiqueta: string;
  icono: string;
}

@Component({
  selector: 'app-compras-internas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Tienda, Carrito, ListaSolicitudes, Catalogo],
  templateUrl: './compras-internas.html',
  styleUrl: './compras-internas.css',
})
export class ComprasInternas implements OnInit {

  private comprasService = inject(ComprasService);
  carrito = inject(CarritoService);

  private rol = localStorage.getItem('trainet_rol') ?? '';

  tienePermiso = ROLES_VISTA_COMPRAS.includes(this.rol);

  cargando = signal(true);
  error = signal<string | null>(null);
  moduloId = signal<number | null>(null);

  // Cada rol ve solo las pestañas que le corresponden.
  pestanas = computed<Pestana[]>(() => {
    const lista: Pestana[] = [];
    if (ROLES_SOLICITUD_COMPRAS.includes(this.rol)) {
      lista.push(
        { id: 'tienda', etiqueta: 'Tienda', icono: 'bi-shop' },
        { id: 'carrito', etiqueta: 'Carrito', icono: 'bi-cart3' },
        { id: 'mis-solicitudes', etiqueta: 'Mis solicitudes', icono: 'bi-receipt' }
      );
    }
    if (ROLES_VER_TODAS_SOLICITUDES.includes(this.rol)) {
      lista.push({ id: 'solicitudes', etiqueta: 'Solicitudes', icono: 'bi-inboxes' });
    }
    if (ROLES_GESTION_COMPRAS.includes(this.rol)) {
      lista.push({ id: 'catalogo', etiqueta: 'Catálogo', icono: 'bi-box-seam' });
    }
    return lista;
  });

  pestanaActiva = signal<string>(this.pestanas()[0]?.id ?? '');

  // Mensaje de éxito que se muestra en "Mis solicitudes" tras confirmar el carrito.
  avisoExito = signal<string | null>(null);

  // La URL (?vista=) y la pestaña activa se mantienen sincronizadas; `actualizarVista` refleja el cambio manual.
  private actualizarVista = sincronizarPestanaConVista(() => this.pestanas().map(p => p.id), id => this.mostrarPestana(id));

  ngOnInit(): void {
    if (!this.tienePermiso) {
      this.cargando.set(false);
      return;
    }

    this.comprasService.listarModuloCompras().subscribe({
      next: modulos => {
        const primero = modulos[0];
        if (!primero) {
          this.error.set('El módulo de compras internas no está configurado.');
          this.cargando.set(false);
          return;
        }
        this.moduloId.set(primero.id);
        this.cargando.set(false);
      },
      error: error => {
        this.error.set(mensajeError(error, 'El módulo de compras internas no está configurado.'));
        this.cargando.set(false);
      }
    });
  }

  // Cambio de pestaña desde la URL: solo estado, nunca navega.
  private mostrarPestana(id: string): void {
    this.avisoExito.set(null);
    this.pestanaActiva.set(id);
  }

  cambiarPestana(id: string): void {
    this.mostrarPestana(id);
    this.actualizarVista(id);
  }

  alEnviarSolicitud(idSolicitud: number): void {
    this.cambiarPestana('mis-solicitudes');
    this.avisoExito.set(`Solicitud #${idSolicitud} enviada. Un directivo o administrador la revisará.`);
  }

}
