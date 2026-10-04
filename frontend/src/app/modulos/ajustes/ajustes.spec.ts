import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Auth } from '../../servicios/auth';
import { Tema } from '../../servicios/tema';
import { Ajustes } from './ajustes';

describe('Ajustes', () => {
  function crear() {
    const logout = vi.fn();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Auth, useValue: { logout } }]
    });
    const fixture = TestBed.createComponent(Ajustes);
    fixture.detectChanges();
    return { logout, html: fixture.nativeElement as HTMLElement };
  }

  afterEach(() => {
    localStorage.removeItem('trainet_modo_oscuro');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-bs-theme');
  });

  it('tiene las tres filas y el enlace a /perfil con su descripción', () => {
    const { html } = crear();
    expect(html.querySelectorAll('.ajustes-fila').length).toBe(3);
    expect(html.textContent).toContain('Datos personales, teléfono y contraseña');
    expect(html.querySelector('a[href="/perfil"]')).not.toBeNull();
  });

  it('no incluye sección de contraseña', () => {
    expect(crear().html.querySelector('input[type="password"]')).toBeNull();
  });

  it('cerrar sesión usa el logout del servicio de autenticación', () => {
    const { logout, html } = crear();
    const boton = Array.from(html.querySelectorAll('button')).find(b => b.textContent?.includes('Cerrar sesión'));
    boton?.click();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('el interruptor usa el servicio de tema: alterna, guarda en su clave y refleja la señal', () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Auth, useValue: { logout: vi.fn() } }]
    });
    const tema = TestBed.inject(Tema);
    tema.activar(); // el shell está montado
    const alternar = vi.spyOn(tema, 'alternar');
    const fixture = TestBed.createComponent(Ajustes);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    const interruptor = html.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(interruptor.checked).toBe(false);

    interruptor.click();
    fixture.detectChanges();
    expect(alternar).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('trainet_modo_oscuro')).toBe('true');
    expect(tema.modoOscuro()).toBe(true);
    expect(interruptor.checked).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');
  });

  it('el componente ya no toca el documento por sí mismo (solo con el servicio)', () => {
    localStorage.setItem('trainet_modo_oscuro', 'true');
    crear();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
