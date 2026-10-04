import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ChatTriny } from '../../modulos/asistente/chat/chat-triny';

// Botón flotante que abre el chat de Triny desde cualquier pantalla (se oculta en la página del asistente).
@Component({
  selector: 'app-lanzador-triny',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChatTriny],
  templateUrl: './lanzador-triny.html',
  styleUrl: './lanzador-triny.css',
})
export class LanzadorTriny {

  private router = inject(Router);

  abierto = signal(false);
  enPaginaDelAsistente = signal(this.router.url.startsWith('/triny'));

  constructor() {
    this.router.events
      .pipe(filter(evento => evento instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(evento => {
        this.enPaginaDelAsistente.set(evento.urlAfterRedirects.startsWith('/triny'));
        // El panel se cierra al cambiar de página.
        this.abierto.set(false);
      });
  }

  alternar(): void {
    this.abierto.update(valor => !valor);
  }

  cerrar(): void {
    this.abierto.set(false);
  }

}
