import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  fecha_registro: string;
  telefono: string;
  // Solo dígitos (6 a 10) o null. La gestiona el administrador.
  cedula: string | null;
  is_active: boolean;
  rol: string;
}

export interface Supervisor {
  id: number;
  fo_usuario: number;
  fo_usuario_nombre?: string;
}

export interface PerfilUsuario {
  puesto?: string;
  fecha_ingreso?: string;
  fo_supervisor?: number;
  departamento?: string;
  especialidad_tecnica?: string;
  experiencia?: number;
}

export interface UsuarioCrear {
  nombre: string;
  email: string;
  telefono: string;
  cedula?: string | null;
  rol: string;
  perfil?: PerfilUsuario;
}

// Contacto del supervisor del empleado (solo nombre y correo).
export interface SupervisorContacto {
  nombre: string;
  email: string;
}

export interface UsuarioDetalle extends Usuario {
  perfil: PerfilUsuario | null;
  // null si el usuario no es empleado o no tiene supervisor asignado.
  supervisor: SupervisorContacto | null;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {

  private http = inject(HttpClient);

  listar(filtros?: { search?: string; rol?: string }): Observable<Usuario[]> {
    let params = new HttpParams();
    if (filtros?.search) {
      params = params.set('search', filtros.search);
    }
    if (filtros?.rol) {
      params = params.set('rol', filtros.rol);
    }
    return this.http.get<Usuario[]>(`${environment.apiUrl}/usuarios/`, { params });
  }

  obtener(id: number): Observable<UsuarioDetalle> {
    return this.http.get<UsuarioDetalle>(`${environment.apiUrl}/usuarios/${id}/`);
  }

  crear(datos: UsuarioCrear): Observable<Usuario> {
    return this.http.post<Usuario>(`${environment.apiUrl}/usuarios/`, datos);
  }

  actualizar(id: number, datos: Partial<UsuarioCrear & { is_active: boolean }>): Observable<Usuario> {
    return this.http.patch<Usuario>(`${environment.apiUrl}/usuarios/${id}/`, datos);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/usuarios/${id}/`);
  }

  cambiarPassword(passwordActual: string, passwordNueva: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(
      `${environment.apiUrl}/usuarios/cambiar-password/`,
      { password_actual: passwordActual, password_nueva: passwordNueva }
    );
  }

  solicitarRecuperacion(email: string): Observable<{ detail: string }> {
    return this.http.post<{ detail: string }>(
      `${environment.apiUrl}/usuarios/solicitar-recuperacion/`,
      { email }
    );
  }

  listarSupervisores(): Observable<Supervisor[]> {
    return this.http.get<Supervisor[]>(`${environment.apiUrl}/supervisores/`);
  }

}
