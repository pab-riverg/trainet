import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuLateral } from '../servicios/menu-lateral';
import { Tema } from '../servicios/tema';
import { Main } from './main';

describe('Main (shell autenticado)', () => {
  afterEach(() => {
    localStorage.removeItem('trainet_modo_oscuro');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-bs-theme');
    document.body.classList.remove('sidebar-open');
    document.body.style.removeProperty('overflow');
  });

  function crear() {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.overrideComponent(Main, { set: { imports: [], template: '<div></div>', templateUrl: undefined, styleUrl: undefined } });
    const fixture = TestBed.createComponent(Main);
    return fixture;
  }

  it('activa el tema al iniciarse y lo quita al destruirse', () => {
    localStorage.setItem('trainet_modo_oscuro', 'true');
    const activar = vi.spyOn(Tema.prototype, 'activar');
    const desactivar = vi.spyOn(Tema.prototype, 'desactivar');
    const fixture = crear();
    fixture.detectChanges();
    expect(activar).toHaveBeenCalledTimes(1);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-bs-theme')).toBe('dark');

    fixture.destroy();
    expect(desactivar).toHaveBeenCalledTimes(1);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    expect(document.documentElement.hasAttribute('data-bs-theme')).toBe(false);
  });

  it('al destruirse libera el panel lateral: el body no queda bloqueado', () => {
    const fixture = crear();
    const menu = TestBed.inject(MenuLateral);
    fixture.detectChanges();
    menu.abrir();
    expect(document.body.style.overflow).toBe('hidden');

    fixture.destroy();
    expect(menu.abierto()).toBe(false);
    expect(document.body.classList.contains('sidebar-open')).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('ya no define su propio closeSidebar: el velo usa el servicio', () => {
    const fixture = crear();
    expect('closeSidebar' in fixture.componentInstance).toBe(false);
  });
});
