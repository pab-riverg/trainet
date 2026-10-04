import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ModuloMenu, RespuestaInicio, TarjetaInicio, UsuarioInicio } from '../modelos/inicio';
import { mensajeError } from '../utilidades/errores';

/**
 * Datos de la página Inicio y del menú lateral (GET /api/inicio/), guardados en un signal.
 * Es la única fuente de visibilidad de módulos por rol: el menú y el guard de rutas leen de aquí.
 */
@Injectable({
  providedIn: 'root'
})
export class InicioService {

  private http = inject(HttpClient);

  private respuesta = signal<RespuestaInicio | null>(null);
  private cargandoInterno = signal(false);
  private errorInterno = signal<string | null>(null);

  /** Petición en curso, compartida para que el menú, el guard y la página no pidan lo mismo dos veces. */
  private peticion$: Observable<boolean> | null = null;
  /** Se incrementa en cada limpiar(): una respuesta de otra sesión que llegue tarde se descarta. */
  private generacion = 0;

  readonly usuario = computed<UsuarioInicio | null>(() => this.respuesta()?.usuario ?? null);
  readonly modulos = computed<ModuloMenu[]>(() => this.respuesta()?.modulos ?? []);
  readonly tarjetas = computed<TarjetaInicio[]>(() => this.respuesta()?.tarjetas ?? []);
  readonly cargando = this.cargandoInterno.asReadonly();
  readonly error = this.errorInterno.asReadonly();

  /**
   * Carga los datos. Sin `forzar`, no hace nada si ya hay datos guardados;
   * con `forzar` los vuelve a pedir (por ejemplo, al entrar a Inicio para refrescar las tarjetas).
   */
  cargar(forzar = false): void {
    if (this.respuesta() && !forzar) {
      return;
    }
    this.solicitar().subscribe();
  }

  /**
   * Garantiza que el menú esté disponible: usa lo guardado o lo carga si falta (por ejemplo al recargar con F5).
   * Emite true si hay datos y false si la carga falló.
   */
  asegurarModulos(): Observable<boolean> {
    return this.respuesta() ? of(true) : this.solicitar();
  }

  /** Olvida todo. Se llama al iniciar y al cerrar sesión para no mostrar nunca datos de otro usuario. */
  limpiar(): void {
    this.generacion++;
    this.respuesta.set(null);
    this.errorInterno.set(null);
    this.cargandoInterno.set(false);
    this.peticion$ = null;
  }

  private solicitar(): Observable<boolean> {
    if (this.peticion$) {
      return this.peticion$;
    }
    const generacion = this.generacion;
    this.cargandoInterno.set(true);
    this.errorInterno.set(null);

    const peticion$ = this.http.get<RespuestaInicio>(`${environment.apiUrl}/inicio/`).pipe(
      tap(respuesta => {
        if (generacion === this.generacion) {
          this.respuesta.set(respuesta);
        }
      }),
      map(() => true),
      catchError(error => {
        if (generacion === this.generacion) {
          this.errorInterno.set(mensajeError(error, 'No se pudo cargar tu inicio.'));
        }
        return of(false);
      }),
      finalize(() => {
        if (generacion === this.generacion) {
          this.cargandoInterno.set(false);
          this.peticion$ = null;
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );
    this.peticion$ = peticion$;
    return peticion$;
  }

}
