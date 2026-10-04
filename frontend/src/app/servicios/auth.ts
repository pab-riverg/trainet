import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import type { Usuario } from './usuarios';
import { CarritoService } from './carrito';
import { InicioService } from './inicio';

interface RespuestaToken {
  access: string;
  refresh: string;
}

@Injectable({
  providedIn: 'root'
})
export class Auth {

  private http = inject(HttpClient);
  private router = inject(Router);
  private inicio = inject(InicioService);
  private carrito = inject(CarritoService);

  login(email: string, password: string): Observable<Usuario> {
    // Nunca debe verse el menú ni las tarjetas de otra sesión en el mismo navegador.
    this.inicio.limpiar();
    // El carrito es de la sesión: otro usuario en el mismo navegador nunca ve el del anterior.
    this.carrito.vaciar();
    return this.http.post<RespuestaToken>(`${environment.apiUrl}/token/`, { email, password }).pipe(
      tap(respuesta => {
        localStorage.setItem('trainet_token', respuesta.access);
        localStorage.setItem('trainet_refresh', respuesta.refresh);
      }),
      switchMap(respuesta => {
        const payload = this.decodificarPayloadJwt(respuesta.access);
        return this.http.get<Usuario>(`${environment.apiUrl}/usuarios/${payload.user_id}/`);
      }),
      tap(usuario => {
        localStorage.setItem('trainet_rol', usuario.rol);
        localStorage.setItem('trainet_nombre', usuario.nombre);
        localStorage.setItem('trainet_id', String(usuario.id));
      })
    );
  }

  logout(): void {
    this.inicio.limpiar();
    this.carrito.vaciar();
    localStorage.removeItem('trainet_token');
    localStorage.removeItem('trainet_refresh');
    localStorage.removeItem('trainet_rol');
    localStorage.removeItem('trainet_nombre');
    localStorage.removeItem('trainet_id');
    this.router.navigate(['/login']);
  }

  private decodificarPayloadJwt(token: string): { user_id: number } {
    const payloadBase64Url = token.split('.')[1];
    const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (payloadBase64.length % 4)) % 4);
    const payloadJson = atob(payloadBase64 + padding);
    return JSON.parse(payloadJson);
  }

}
