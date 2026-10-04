import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UsuarioDetalle, UsuariosService } from '../../servicios/usuarios';
import { Perfil } from './perfil';

const BASE: UsuarioDetalle = {
  id: 7, nombre: 'Ana Pérez', email: 'ana@trainet.test', fecha_registro: '2026-03-05', telefono: '0999111222',
  cedula: '1234567890', is_active: true, rol: 'empleado', perfil: null, supervisor: null
};

describe('Perfil', () => {
  function crear(detalle: UsuarioDetalle) {
    localStorage.setItem('trainet_id', String(detalle.id));
    TestBed.configureTestingModule({
      providers: [{ provide: UsuariosService, useValue: { obtener: () => of(detalle) } }]
    });
    const fixture = TestBed.createComponent(Perfil);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => localStorage.removeItem('trainet_id'));

  it('muestra la cabecera con iniciales, nombre, email y rol', () => {
    const { html } = crear(BASE);
    expect(html.querySelector('.perfil-avatar')?.textContent?.trim()).toBe('AP');
    expect(html.querySelector('.perfil-nombre')?.textContent).toContain('Ana Pérez');
    expect(html.textContent).toContain('ana@trainet.test');
    expect(html.querySelector('app-estado-badge')?.textContent).toContain('Empleado');
  });

  it('con supervisor muestra la tarjeta con su correo como mailto', () => {
    const { html } = crear({ ...BASE, supervisor: { nombre: 'Luis Gómez', email: 'luis@trainet.test' } });
    expect(html.textContent).toContain('Mi supervisor');
    expect(html.textContent).toContain('Luis Gómez');
    const enlaces = Array.from(html.querySelectorAll('a')).map(a => a.getAttribute('href'));
    expect(enlaces).toContain('mailto:luis@trainet.test');
    expect(html.textContent).toContain('Escribirle');
  });

  it('sin supervisor no muestra nada de supervisor', () => {
    const { html } = crear(BASE);
    expect(html.textContent).not.toContain('Mi supervisor');
    expect(html.textContent).not.toContain('Escribirle');
  });

  it('la cédula solo aparece si existe', () => {
    expect(crear(BASE).html.textContent).toContain('Cédula');
    TestBed.resetTestingModule();
    expect(crear({ ...BASE, cedula: null }).html.textContent).not.toContain('Cédula');
  });

  it('el ojo alterna el tipo del campo y el icono, con aria-label', () => {
    const { fixture, html } = crear(BASE);
    const campo = html.querySelector('#perfil-pw-nueva') as HTMLInputElement;
    const boton = campo.parentElement?.querySelector('button') as HTMLButtonElement;
    expect(campo.type).toBe('password');
    expect(boton.getAttribute('aria-label')).toBe('Mostrar contraseña nueva');
    expect(boton.querySelector('i')?.classList).toContain('bi-eye');

    boton.click();
    fixture.detectChanges();
    expect(campo.type).toBe('text');
    expect(boton.getAttribute('aria-label')).toBe('Ocultar contraseña nueva');
    expect(boton.querySelector('i')?.classList).toContain('bi-eye-slash');

    // Los otros campos no cambian.
    expect((html.querySelector('#perfil-pw-actual') as HTMLInputElement).type).toBe('password');

    boton.click();
    fixture.detectChanges();
    expect(campo.type).toBe('password');
  });
});
