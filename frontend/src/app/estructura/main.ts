import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header';
import { Nav } from './nav/nav';
import { Footer } from './footer/footer';
import { LanzadorTriny } from './lanzador-triny/lanzador-triny';
import { MenuLateral } from '../servicios/menu-lateral';
import { Tema } from '../servicios/tema';

@Component({
  selector: 'app-main',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Header, Nav, Footer, LanzadorTriny],
  templateUrl: './main.html',
  styleUrl: './main.css'
})
export class Main implements OnInit, OnDestroy {

  private tema = inject(Tema);
  protected menu = inject(MenuLateral);

  // El modo oscuro solo vive mientras este shell (la app con sesión) está montado.
  ngOnInit(): void {
    this.tema.activar();
  }

  ngOnDestroy(): void {
    this.tema.desactivar();
    // Al salir del shell (cierre de sesión) el body no puede quedar bloqueado por un panel abierto.
    this.menu.cerrar();
  }

}
