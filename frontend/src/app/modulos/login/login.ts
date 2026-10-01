import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '../../servicios/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  errorMsg: string = '';

  constructor(private router: Router, private auth: Auth) {}

  login(email: string, password: string) {
    this.auth.login(email, password).subscribe({
      next: (respuesta: any) => {
        localStorage.setItem('trainet_token', respuesta.access);
        localStorage.setItem('trainet_refresh', respuesta.refresh);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.errorMsg = 'Correo o contraseña incorrectos';
      }
    });
  }

}
