import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Auth } from '../../servicios/auth';
import { InicioService } from '../../servicios/inicio';
import { MenuLateral } from '../../servicios/menu-lateral';
import { ModuloMenu, SeccionMenu } from '../../modelos/inicio';
import { Nav, UMBRAL_MODULOS_PARA_MAS } from './nav';

@Component({ template: '' })
class Vacio {}

const modulo = (clave: string, seccion: SeccionMenu): ModuloMenu =>
  ({ clave, titulo: clave, ruta: `/${clave}`, icono: 'bi-x', seccion });

// Módulos de relleno en 'principal' hasta alcanzar `total` en la barra (sin contar Ayuda).
function modulosConTotal(total: number): ModuloMenu[] {
  const fijos = [modulo('capacitacion', 'mas'), modulo('documentos', 'mas'), modulo('inventario', 'gestion'), modulo('ayuda', 'sistema')];
  const relleno = Array.from({ length: total - 3 }, (_, i) => modulo(`relleno${i}`, 'principal'));
  return [...relleno, ...fijos];
}

function crearNav(modulos: ModuloMenu[]) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', component: Vacio }]),
      { provide: InicioService, useValue: { modulos: signal(modulos), cargar: () => undefined } },
      { provide: Auth, useValue: { logout: () => undefined } }
    ]
  });
  const router = TestBed.inject(Router);
  const nav = TestBed.createComponent(Nav).componentInstance;
  return { nav, router };
}

describe('Nav: grupo "Más"', () => {
  it('con el umbral exacto no agrupa y suma los módulos de "mas" a Gestión', () => {
    const { nav } = crearNav(modulosConTotal(UMBRAL_MODULOS_PARA_MAS));
    expect(nav.mas()).toEqual([]);
    expect(nav.gestion().map(m => m.clave)).toEqual(['inventario', 'capacitacion', 'documentos']);
  });

  it('por encima del umbral agrupa y arranca plegado', () => {
    const { nav } = crearNav(modulosConTotal(UMBRAL_MODULOS_PARA_MAS + 1));
    expect(nav.mas().map(m => m.clave)).toEqual(['capacitacion', 'documentos']);
    expect(nav.gestion().map(m => m.clave)).toEqual(['inventario']);
    expect(nav.mostrarMas()).toBe(false);
  });

  it('Ayuda no cuenta para el umbral', () => {
    const modulos = modulosConTotal(UMBRAL_MODULOS_PARA_MAS);
    expect(modulos.some(m => m.clave === 'ayuda')).toBe(true);
    expect(crearNav(modulos).nav.mas()).toEqual([]);
  });

  it('se despliega al entrar por URL a un módulo del grupo, incluso con subruta y query', async () => {
    const { nav, router } = crearNav(modulosConTotal(UMBRAL_MODULOS_PARA_MAS + 1));
    await router.navigateByUrl('/documentos/detalle/3?x=1#a');
    expect(nav.mostrarMas()).toBe(true);
  });

  it('se mantiene desplegado entre módulos del grupo y se pliega al salir', async () => {
    const { nav, router } = crearNav(modulosConTotal(UMBRAL_MODULOS_PARA_MAS + 1));
    await router.navigateByUrl('/capacitacion');
    expect(nav.mostrarMas()).toBe(true);
    await router.navigateByUrl('/documentos');
    expect(nav.mostrarMas()).toBe(true);
    await router.navigateByUrl('/inventario');
    expect(nav.mostrarMas()).toBe(false);
  });

  it('el botón manual manda hasta la siguiente navegación', async () => {
    const { nav, router } = crearNav(modulosConTotal(UMBRAL_MODULOS_PARA_MAS + 1));
    await router.navigateByUrl('/inventario');
    nav.toggleMas();
    expect(nav.mostrarMas()).toBe(true);
    await router.navigateByUrl('/inventario/otra');
    expect(nav.mostrarMas()).toBe(false);
    await router.navigateByUrl('/capacitacion');
    nav.toggleMas();
    expect(nav.mostrarMas()).toBe(false);
    await router.navigateByUrl('/documentos');
    expect(nav.mostrarMas()).toBe(true);
  });

  it('no confunde rutas que solo comparten prefijo de texto', async () => {
    const { nav, router } = crearNav(modulosConTotal(UMBRAL_MODULOS_PARA_MAS + 1));
    await router.navigateByUrl('/capacitacionextra');
    expect(nav.mostrarMas()).toBe(false);
  });
});

describe('Nav: panel lateral en móvil', () => {
  const MODULOS = [modulo('inicio', 'principal'), modulo('triny', 'principal'), modulo('ayuda', 'sistema')];
  let cerrarSesion: ReturnType<typeof vi.fn>;

  function crearConPlantilla() {
    cerrarSesion = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Vacio }]),
        { provide: InicioService, useValue: { modulos: signal(MODULOS), cargar: () => undefined } },
        { provide: Auth, useValue: { logout: cerrarSesion } }
      ]
    });
    const fixture = TestBed.createComponent(Nav);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement, menu: TestBed.inject(MenuLateral) };
  }

  afterEach(() => {
    document.body.classList.remove('sidebar-open');
    document.body.style.removeProperty('overflow');
  });

  it('el panel tiene id="sidebar" (lo referencian aria-controls de la hamburguesa y de la barra inferior)', () => {
    const { html } = crearConPlantilla();
    expect(html.querySelector('nav')?.id).toBe('sidebar');
  });

  it('al abrirse el panel el foco pasa al primer enlace', () => {
    const { fixture, html, menu } = crearConPlantilla();
    menu.abrir();
    fixture.detectChanges();
    expect(document.activeElement).toBe(html.querySelector('a.sidebar-link'));
  });

  it('pulsar un enlace cierra el panel (aunque la ruta sea la misma y no haya navegación)', () => {
    const { html, menu } = crearConPlantilla();
    menu.abrir();
    html.querySelector<HTMLAnchorElement>('a.sidebar-link')!.click();
    expect(menu.abierto()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('pulsar algo que no es un enlace (una etiqueta de sección) no lo cierra', () => {
    const { html, menu } = crearConPlantilla();
    menu.abrir();
    html.querySelector<HTMLElement>('.nav-section-label')!.click();
    expect(menu.abierto()).toBe(true);
  });

  it('Cerrar sesión es operable con teclado (Enter y Espacio) y con ratón', () => {
    const { html } = crearConPlantilla();
    const salir = Array.from(html.querySelectorAll<HTMLElement>('.sidebar-footer a')).find(a => a.textContent?.includes('Cerrar'))!;
    expect(salir.getAttribute('role')).toBe('button');
    expect(salir.tabIndex).toBe(0);

    salir.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    salir.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    salir.click();
    expect(cerrarSesion).toHaveBeenCalledTimes(3);
  });
});
