import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';
import { AdministracionService } from '../../servicios/administracion';
import { BusquedaService } from '../../servicios/busqueda';
import { InicioService } from '../../servicios/inicio';
import { MenuLateral } from '../../servicios/menu-lateral';
import { NotificacionesService } from '../../servicios/notificaciones';
import { Header } from './header';

@Component({ template: '' })
class Vacio {}

describe('Header: hamburguesa del panel lateral', () => {
  let fixture: ComponentFixture<Header>;
  let html: HTMLElement;
  let menu: MenuLateral;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', component: Vacio }]),
        { provide: NotificacionesService, useValue: { contarNoLeidas: () => of({ total: 0 }) } },
        { provide: AdministracionService, useValue: { nombreEquipo: signal('Equipo'), recargarNombreEquipo: () => undefined, limpiarNombreEquipo: () => undefined } },
        { provide: InicioService, useValue: { modulos: signal([]) } },
        { provide: BusquedaService, useValue: { buscar: () => EMPTY } }
      ]
    });
    menu = TestBed.inject(MenuLateral);
    fixture = TestBed.createComponent(Header);
    fixture.detectChanges();
    html = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    menu.cerrar();
  });

  const boton = () => html.querySelector<HTMLButtonElement>('#sidebar-toggle')!;

  it('declara aria-controls="sidebar" y arranca con aria-expanded="false"', () => {
    expect(boton().getAttribute('aria-controls')).toBe('sidebar');
    expect(boton().getAttribute('aria-expanded')).toBe('false');
  });

  it('aria-expanded refleja el estado del servicio en ambos sentidos', () => {
    boton().click();
    fixture.detectChanges();
    expect(menu.abierto()).toBe(true);
    expect(boton().getAttribute('aria-expanded')).toBe('true');

    boton().click();
    fixture.detectChanges();
    expect(menu.abierto()).toBe(false);
    expect(boton().getAttribute('aria-expanded')).toBe('false');
  });

  it('aria-expanded también sigue al panel cuando se abre desde otro sitio (barra inferior)', () => {
    menu.abrir();
    fixture.detectChanges();
    expect(boton().getAttribute('aria-expanded')).toBe('true');
    menu.cerrar();
    fixture.detectChanges();
    expect(boton().getAttribute('aria-expanded')).toBe('false');
  });

  it('al cerrarse el panel el foco vuelve a la hamburguesa, pero no la recibe al arrancar', async () => {
    expect(document.activeElement).not.toBe(boton());

    menu.abrir();
    fixture.detectChanges();
    expect(document.activeElement).not.toBe(boton());

    await TestBed.inject(Router).navigateByUrl('/capacitacion');
    fixture.detectChanges();
    expect(menu.abierto()).toBe(false);
    expect(document.activeElement).toBe(boton());
  });
});
