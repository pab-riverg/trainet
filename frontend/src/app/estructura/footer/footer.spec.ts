import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { ModuloMenu, SeccionMenu } from '../../modelos/inicio';
import { InicioService } from '../../servicios/inicio';
import { Footer, MAX_ATAJOS_BARRA } from './footer';

@Component({ template: '' })
class Vacio {}

const modulo = (clave: string, seccion: SeccionMenu, titulo = clave): ModuloMenu =>
  ({ clave, titulo, ruta: `/${clave}`, icono: `bi-${clave}`, seccion });

// Menús (InicioService.modulos()) de tres tipos de rol, en el orden que declara el backend.
const ROL_CON_MUCHOS = [
  modulo('inicio', 'principal', 'Inicio'), modulo('dashboard', 'principal', 'Dashboard'), modulo('triny', 'principal', 'Triny AI'),
  modulo('administrador', 'gestion'), modulo('inventario', 'gestion'), modulo('usuarios', 'gestion'),
  modulo('compras', 'gestion'), modulo('reportes', 'gestion'),
  modulo('capacitacion', 'mas'), modulo('documentos', 'mas'),
  modulo('ajustes', 'sistema'), modulo('ayuda', 'sistema')
];
const ROL_SIN_DASHBOARD = [
  modulo('inicio', 'principal'), modulo('triny', 'principal'),
  modulo('inventario', 'gestion'), modulo('compras', 'gestion'), modulo('reportes', 'gestion'),
  modulo('capacitacion', 'mas'), modulo('ajustes', 'sistema'), modulo('ayuda', 'sistema')
];
const ROL_CON_POCOS = [
  modulo('inicio', 'principal'), modulo('triny', 'principal'),
  modulo('capacitacion', 'mas'), modulo('ajustes', 'sistema'), modulo('ayuda', 'sistema')
];

describe('Footer (barra inferior móvil)', () => {
  let modulos: ReturnType<typeof signal<ModuloMenu[]>>;

  function crear(lista: ModuloMenu[]): { fixture: ComponentFixture<Footer>; html: HTMLElement } {
    modulos = signal(lista);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Vacio }]),
        { provide: InicioService, useValue: { modulos } }
      ]
    });
    const fixture = TestBed.createComponent(Footer);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  }

  const textos = (html: HTMLElement) =>
    Array.from(html.querySelectorAll('.bottom-nav-item')).map(item => item.textContent?.trim());

  it('con muchos módulos muestra 5 atajos: Inicio primero y Triny AI en el centro, sin botón Menú', () => {
    const { html } = crear(ROL_CON_MUCHOS);
    expect(MAX_ATAJOS_BARRA).toBe(5);
    expect(textos(html)).toEqual(['Inicio', 'Dashboard', 'Triny AI', 'administrador', 'inventario']);
    expect(html.querySelector('button')).toBeNull();
  });

  it('identifica Inicio y Triny por clave aunque no vengan en esa posición del registro', () => {
    const { html } = crear([modulo('inventario', 'gestion'), modulo('triny', 'principal', 'Triny AI'), modulo('inicio', 'principal', 'Inicio'), modulo('usuarios', 'gestion'), modulo('compras', 'gestion'), modulo('reportes', 'gestion')]);
    expect(textos(html)).toEqual(['Inicio', 'inventario', 'Triny AI', 'usuarios', 'compras']);
  });

  it('con pocos módulos muestra los que haya, con Triny en el centro de la lista resultante', () => {
    expect(textos(crear(ROL_CON_POCOS).html)).toEqual(['inicio', 'triny']);
    TestBed.resetTestingModule();
    const tres = [modulo('inicio', 'principal', 'Inicio'), modulo('triny', 'principal', 'Triny AI'), modulo('inventario', 'gestion')];
    expect(textos(crear(tres).html)).toEqual(['Inicio', 'Triny AI', 'inventario']);
  });

  it('un rol sin Triny muestra Inicio y los demás, sin huecos', () => {
    const { html } = crear([modulo('inicio', 'principal', 'Inicio'), modulo('inventario', 'gestion'), modulo('soporte', 'mas'), modulo('compras', 'gestion')]);
    expect(textos(html)).toEqual(['Inicio', 'inventario', 'compras']);
  });

  it('un rol sin Inicio mantiene Triny en el centro', () => {
    const { html } = crear([modulo('triny', 'principal', 'Triny AI'), modulo('a', 'gestion'), modulo('b', 'gestion'), modulo('c', 'gestion'), modulo('d', 'gestion')]);
    expect(textos(html)).toEqual(['a', 'b', 'Triny AI', 'c', 'd']);
  });

  it('no usa módulos de "mas" ni "sistema" como atajos', () => {
    const { html } = crear(ROL_SIN_DASHBOARD);
    expect(textos(html)).toEqual(['inicio', 'inventario', 'triny', 'compras', 'reportes']);
  });

  it('los atajos usan el icono y la ruta absoluta del módulo', () => {
    const { html } = crear(ROL_CON_MUCHOS);
    const enlaces = Array.from(html.querySelectorAll<HTMLAnchorElement>('a.bottom-nav-item'));
    expect(enlaces.map(a => a.getAttribute('href'))).toEqual(['/inicio', '/dashboard', '/triny', '/administrador', '/inventario']);
    expect(enlaces[0].querySelector('i')?.className).toContain('bi-inicio');
  });

  it('se actualiza cuando cambian los módulos del rol', () => {
    const { fixture, html } = crear(ROL_CON_POCOS);
    modulos.set(ROL_CON_MUCHOS);
    fixture.detectChanges();
    expect(textos(html)).toHaveLength(5);
  });

  it('marca como activo el atajo de la ruta actual', async () => {
    const { fixture, html } = crear(ROL_CON_MUCHOS);
    await TestBed.inject(Router).navigateByUrl('/triny');
    await fixture.whenStable();
    fixture.detectChanges();
    const activos = Array.from(html.querySelectorAll('.bottom-nav-item.active')).map(a => a.textContent?.trim());
    expect(activos).toEqual(['Triny AI']);
  });
});
