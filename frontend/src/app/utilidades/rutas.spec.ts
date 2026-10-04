import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { rutaDeBusquedaSegura, rutaDeModulo, rutaInternaSegura, sincronizarBusquedaConQ, sincronizarPestanaConVista } from './rutas';

describe('rutaInternaSegura', () => {
  it('acepta rutas internas de módulo, con o sin vista', () => {
    for (const ruta of ['/compras', '/soporte?vista=gestion', '/recursos?vista=mis-pedidos', '/compras/lista', '/a?x=1&y=2']) {
      expect(rutaInternaSegura(ruta), ruta).toBe(true);
    }
  });

  it('rechaza esquemas, dobles barras y rutas que no empiezan por /', () => {
    for (const ruta of ['http://malo.test', 'https://malo.test/x', 'javascript:alert(1)', '//malo.test', '/a//b', 'compras',
      '/\\malo', 'data:text/html,x', '/compras?vista=//x', '/compras#frag', '/compras?vista=<b>', '/compras x']) {
      expect(rutaInternaSegura(ruta), ruta).toBe(false);
    }
  });

  it('rechaza vacías, nulas e indefinidas y rutas demasiado largas', () => {
    expect(rutaInternaSegura('')).toBe(false);
    expect(rutaInternaSegura(null)).toBe(false);
    expect(rutaInternaSegura(undefined)).toBe(false);
    expect(rutaInternaSegura('/' + 'a'.repeat(130))).toBe(false);
  });
});

describe('rutaDeModulo', () => {
  it('devuelve el primer segmento', () => {
    expect(rutaDeModulo('/compras?vista=solicitudes')).toBe('/compras');
    expect(rutaDeModulo('/soporte')).toBe('/soporte');
  });
});

describe('rutaDeBusquedaSegura', () => {
  it('acepta módulo, módulo + vista, módulo + q y módulo + vista + q codificado', () => {
    for (const ruta of ['/soporte', '/soporte?vista=gestion', '/inventario?q=impresora', '/soporte?vista=gestion&q=a%20b',
      '/documentos?q=%C3%B1and%C3%BA', '/compras?vista=mis-solicitudes&q=%22x%22%26y%23z%3F']) {
      expect(rutaDeBusquedaSegura(ruta), ruta).toBe(true);
    }
  });

  it('rechaza detalles, ids, esquemas, texto sin codificar y parámetros extra', () => {
    for (const ruta of ['/soporte/12', '/soporte?vista=gestion&id=3', '/soporte?q=a b', '/soporte?q=a&b', '/soporte?q=<b>',
      '/soporte?q=%zz', '/soporte?q=', '/soporte?vista=', '/soporte?q=x&vista=gestion', 'http://malo.test', '//malo.test',
      'javascript:alert(1)', '/Soporte', '/soporte#x', '/', '', '/soporte?q=%2F%2F/x']) {
      expect(rutaDeBusquedaSegura(ruta), ruta).toBe(false);
    }
    expect(rutaDeBusquedaSegura(null)).toBe(false);
    expect(rutaDeBusquedaSegura(undefined)).toBe(false);
  });

  it('acepta el texto máximo (60 caracteres de tres bytes) y rechaza rutas desmedidas', () => {
    expect(rutaDeBusquedaSegura('/soporte?vista=gestion&q=' + encodeURIComponent('€'.repeat(60)))).toBe(true);
    expect(rutaDeBusquedaSegura('/soporte?q=' + 'a'.repeat(800))).toBe(false);
  });
});

@Component({ template: '' })
class PaginaConPestanas {
  pestana = signal('a');
  control = new FormControl('', { nonNullable: true });
  actualizarVista = sincronizarPestanaConVista(() => ['a', 'b', 'c'], id => this.pestana.set(id));

  constructor() {
    sincronizarBusquedaConQ(this.control);
  }
}

describe('sincronización de pestañas y búsqueda con la URL', () => {
  async function abrir(url: string) {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'modulo', component: PaginaConPestanas }])] });
    const harness = await RouterTestingHarness.create();
    const pagina = await harness.navigateByUrl(url, PaginaConPestanas);
    return { harness, pagina, router: TestBed.inject(Router) };
  }

  it('abre la pestaña de ?vista= al cargar', async () => {
    const { pagina } = await abrir('/modulo?vista=b');
    expect(pagina.pestana()).toBe('b');
  });

  it('reacciona al cambio de ?vista= aunque ya estés en el módulo', async () => {
    const { harness, pagina } = await abrir('/modulo?vista=b');
    await harness.navigateByUrl('/modulo?vista=c');
    expect(pagina.pestana()).toBe('c');
  });

  it('ignora una vista desconocida y conserva la pestaña', async () => {
    const { harness, pagina } = await abrir('/modulo?vista=b');
    await harness.navigateByUrl('/modulo?vista=zzz');
    expect(pagina.pestana()).toBe('b');
  });

  it('al cambiar de pestaña a mano refleja vista en la URL, quita q y no entra en bucle', async () => {
    const { pagina, router } = await abrir('/modulo?vista=a&q=hola');
    const fin: string[] = [];
    router.events.subscribe(evento => {
      if (evento instanceof NavigationEnd) {
        fin.push(evento.urlAfterRedirects);
      }
    });
    pagina.actualizarVista('c');
    await new Promise(resolver => setTimeout(resolver, 20));
    expect(router.url).toBe('/modulo?vista=c');
    expect(pagina.pestana()).toBe('c');
    expect(fin).toEqual(['/modulo?vista=c']);
  });

  it('una notificación a otra pestaña funciona tras cambiar de pestaña a mano', async () => {
    const { harness, pagina } = await abrir('/modulo?vista=b');
    pagina.pestana.set('a');
    pagina.actualizarVista('a');
    await new Promise(resolver => setTimeout(resolver, 20));
    await harness.navigateByUrl('/modulo?vista=b');
    expect(pagina.pestana()).toBe('b');
  });

  it('precarga y actualiza la caja de búsqueda con ?q=, y sin q no la toca', async () => {
    const { harness, pagina } = await abrir('/modulo?q=hola');
    expect(pagina.control.value).toBe('hola');
    await harness.navigateByUrl('/modulo?q=chau%20mundo');
    expect(pagina.control.value).toBe('chau mundo');
    pagina.control.setValue('escrito a mano');
    await harness.navigateByUrl('/modulo?vista=b');
    expect(pagina.control.value).toBe('escrito a mano');
  });
});
