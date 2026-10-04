import { inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { CarritoService } from '../servicios/carrito';

function esPeticionDeAutenticacion(url: string): boolean {
  return url === `${environment.apiUrl}/token/` || url === `${environment.apiUrl}/token/refresh/`;
}

function agregarToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function cerrarSesionYRedirigir(router: Router, carrito: CarritoService): void {
  carrito.vaciar();
  localStorage.removeItem('trainet_token');
  localStorage.removeItem('trainet_refresh');
  localStorage.removeItem('trainet_rol');
  localStorage.removeItem('trainet_nombre');
  localStorage.removeItem('trainet_id');
  router.navigate(['/login']);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const carrito = inject(CarritoService);

  const esApi = req.url.startsWith(environment.apiUrl);
  const esAuth = esPeticionDeAutenticacion(req.url);

  const token = localStorage.getItem('trainet_token');
  const peticion = esApi && !esAuth && token ? agregarToken(req, token) : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401 || !esApi || esAuth) {
        return throwError(() => error);
      }

      const refresh = localStorage.getItem('trainet_refresh');
      if (!refresh) {
        cerrarSesionYRedirigir(router, carrito);
        return throwError(() => error);
      }

      return http.post<{ access: string }>(`${environment.apiUrl}/token/refresh/`, { refresh }).pipe(
        switchMap(respuesta => {
          localStorage.setItem('trainet_token', respuesta.access);
          return next(agregarToken(req, respuesta.access));
        }),
        catchError(errorRefresh => {
          cerrarSesionYRedirigir(router, carrito);
          return throwError(() => errorRefresh);
        })
      );
    })
  );
};
