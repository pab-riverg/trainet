import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Acceso rápido a Triny: el cuadro "¿En qué piensas hoy?". Solo navega a /triny
// (el chat aún no admite precargar una pregunta por parámetro, así que el texto no se transfiere).
@Component({
  selector: 'app-tarjeta-triny',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  templateUrl: './tarjeta-triny.html',
  styleUrls: ['../tarjeta-base.css', './tarjeta-triny.css'],
})
export class TarjetaTriny {

  private router = inject(Router);

  trinyForm = new FormGroup({
    texto: new FormControl('', { nonNullable: true })
  });

  irATriny(): void {
    this.router.navigate(['/triny']);
  }

}
