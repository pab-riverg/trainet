import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../servicios/auth';
import { Tema } from '../../servicios/tema';

@Component({
  selector: 'app-ajustes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.css',
})
export class Ajustes {

  private auth = inject(Auth);
  protected tema = inject(Tema);

  // El logout del servicio limpia la sesión y redirige a /login.
  cerrarSesion(): void {
    this.auth.logout();
  }

}
