import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Usuario, UsuariosService } from '../../servicios/usuarios';
import { Usuarios } from './usuarios';

const usuario = (id: number, rol = 'empleado'): Usuario => ({
  id, nombre: `Usuario ${id}`, email: `u${id}@trainet.test`, fecha_registro: '2026-01-01', telefono: '',
  cedula: null, is_active: true, rol
});

describe('Usuarios: paginación', () => {
  function crear() {
    const todos = Array.from({ length: 25 }, (_, i) => usuario(i + 1));
    const listar = vi.fn((filtros?: { search?: string; rol?: string }) =>
      of(filtros?.rol ? todos.slice(0, 3).map(u => ({ ...u, rol: filtros.rol as string })) : todos));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: UsuariosService, useValue: { listar, listarSupervisores: () => of([]) } }
      ]
    });
    localStorage.setItem('trainet_rol', 'administrador');
    const fixture = TestBed.createComponent(Usuarios);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    const filas = () => html.querySelectorAll('.users-table tbody tr').length;
    const irA = (n: number) => {
      (html.querySelector(`button[aria-label="Ir a la página ${n}"]`) as HTMLButtonElement).click();
      fixture.detectChanges();
    };
    return { fixture, html, filas, irA };
  }

  afterEach(() => {
    localStorage.removeItem('trainet_rol');
    document.body.replaceChildren();
  });

  it('muestra 10 filas y cambia de página (la última con 5)', () => {
    const { html, filas, irA } = crear();
    expect(filas()).toBe(10);
    expect(html.textContent).toContain('Mostrando 1–10 de 25');
    irA(2);
    expect(html.querySelector('.users-table tbody tr td')?.textContent).toBe('Usuario 11');
    irA(3);
    expect(filas()).toBe(5);
  });

  it('al filtrar por rol vuelve a la página 1 y pagina sobre el resultado filtrado', () => {
    const { fixture, html, filas, irA } = crear();
    irA(3);
    const filtro = html.querySelector('select') as HTMLSelectElement;
    filtro.value = 'supervisor';
    filtro.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(filas()).toBe(3);
    expect(html.querySelector('nav[aria-label="Paginación"]')).toBeNull();
  });
});
