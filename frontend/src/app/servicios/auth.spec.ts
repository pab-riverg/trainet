import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Articulo } from '../modelos/compras';
import { Auth } from './auth';
import { CarritoService } from './carrito';

const articulo = { id: 1, nombre: 'Mouse', precio_referencia: 500 } as Articulo;

// Payload JWT con user_id = 7.
const TOKEN = `x.${btoa(JSON.stringify({ user_id: 7 }))}.y`;

describe('Auth y carrito', () => {
  let http: HttpTestingController;
  let carrito: CarritoService;
  let auth: Auth;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(Router).navigate = vi.fn(() => Promise.resolve(true));
    http = TestBed.inject(HttpTestingController);
    carrito = TestBed.inject(CarritoService);
    auth = TestBed.inject(Auth);
    carrito.agregar(articulo);
  });

  afterEach(() => localStorage.clear());

  it('cerrar sesión vacía el carrito', () => {
    expect(carrito.numeroLineas()).toBe(1);
    auth.logout();
    expect(carrito.numeroLineas()).toBe(0);
  });

  it('iniciar sesión (otro usuario en el mismo navegador) parte con el carrito vacío', () => {
    auth.login('otro@trainet.test', 'x').subscribe();
    expect(carrito.numeroLineas()).toBe(0);
    http.expectOne(r => r.url.endsWith('/token/')).flush({ access: TOKEN, refresh: 'r' });
    http.expectOne(r => r.url.endsWith('/usuarios/7/')).flush({ id: 7, rol: 'empleado', nombre: 'Otro' });
    expect(carrito.numeroLineas()).toBe(0);
    http.verify();
  });
});
