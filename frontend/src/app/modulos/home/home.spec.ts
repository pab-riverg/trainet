import { Title } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from '../../app.routes';
import { CATALOGO_ROLES } from '../../modelos/roles';
import { CORREO_CONTACTO_AYUDA } from '../../utilidades/ayuda';
import { CAPTURAS_PRODUCTO, TITULO_PAGINA_HOME } from '../../utilidades/home';
import { Home } from './home';

describe('Home', () => {
  afterEach(() => localStorage.removeItem('trainet_token'));

  function crear(conSesion = false) {
    if (conSesion) {
      localStorage.setItem('trainet_token', 'token-de-prueba');
    }
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  }

  const pestanas = (html: HTMLElement) => Array.from(html.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const imagenDelProducto = (html: HTMLElement) => html.querySelector('#panel-producto img') as HTMLImageElement | null;
  const textos = (lista: NodeListOf<Element>) => Array.from(lista).map(el => el.textContent?.trim());

  it('renderiza todas las secciones con sus anclas y landmarks', () => {
    const { html } = crear();
    for (const id of ['sobre-trainet', 'funciones', 'roles', 'triny']) {
      const seccion = html.querySelector(`section#${id}`);
      expect(seccion, id).not.toBeNull();
      const titulo = html.querySelector(`#${seccion?.getAttribute('aria-labelledby')}`);
      expect(titulo?.tagName, id).toBe('H2');
    }
    expect(html.querySelector('header')).not.toBeNull();
    expect(html.querySelector('main')).not.toBeNull();
    expect(html.querySelector('footer')).not.toBeNull();
  });

  it('tiene un solo h1', () => {
    const { html } = crear();
    expect(html.querySelectorAll('h1').length).toBe(1);
    expect(html.querySelector('h1')?.textContent).toContain('Capacita, organiza y gestiona tu empresa desde un solo lugar.');
  });

  it('los enlaces ancla de la barra y del pie apuntan a cada fragmento', () => {
    const { html } = crear();
    for (const [contenedor, esperados] of [['header nav', 4], ['footer nav', 4]] as const) {
      const enlaces = Array.from(html.querySelectorAll<HTMLAnchorElement>(`${contenedor} a`));
      for (const id of ['funciones', 'roles', 'triny', 'sobre-trainet']) {
        expect(enlaces.some(a => a.getAttribute('href') === `/#${id}`), `${contenedor} ${id}`).toBe(true);
      }
      expect(enlaces.filter(a => a.getAttribute('href')?.startsWith('/#')).length).toBe(esperados);
    }
    expect(textos(html.querySelectorAll('header nav a'))).toEqual(['Funciones', 'Roles', 'Triny AI', 'Sobre Trainet']);
  });

  it('muestra los 11 roles con las etiquetas del catálogo del sistema', () => {
    const { html } = crear();
    const nombres = textos(html.querySelectorAll('#roles li h3'));
    expect(nombres.length).toBe(11);
    expect(nombres).toEqual(CATALOGO_ROLES.map(rol => rol.etiqueta));
  });

  it('muestra las seis funciones y las tres funciones principales', () => {
    const { html } = crear();
    expect(html.querySelectorAll('#funciones li').length).toBe(6);
    expect(html.querySelectorAll('#sobre-trainet li').length).toBe(3);
    expect(html.querySelector('#funciones a')).toBeNull();
  });

  it('no ofrece registro público', () => {
    for (const conSesion of [false, true]) {
      TestBed.resetTestingModule();
      const { html } = crear(conSesion);
      expect(html.textContent).not.toContain('Registrarme');
      expect(html.textContent?.toLowerCase()).not.toContain('regístrate');
      expect(html.querySelector('a[href="/registro"]')).toBeNull();
    }
  });

  it('sin sesión el acceso dice "Iniciar sesión" y lleva a /login', () => {
    const { html } = crear(false);
    const accesos = Array.from(html.querySelectorAll<HTMLAnchorElement>('a.home-boton-primario'));
    expect(accesos.length).toBe(3);
    for (const acceso of accesos) {
      expect(acceso.textContent?.trim()).toBe('Iniciar sesión');
      expect(acceso.getAttribute('href')).toBe('/login');
    }
    expect(html.textContent).not.toContain('Ir a mi panel');
    expect(html.textContent).toContain('¿Aún no tienes acceso? Tu administrador crea tu cuenta.');
  });

  it('con sesión el acceso dice "Ir a mi panel" y lleva a /inicio (sin redirigir)', () => {
    const { html } = crear(true);
    const accesos = Array.from(html.querySelectorAll<HTMLAnchorElement>('a.home-boton-primario'));
    for (const acceso of accesos) {
      expect(acceso.textContent?.trim()).toBe('Ir a mi panel');
      expect(acceso.getAttribute('href')).toBe('/inicio');
    }
    expect(html.textContent).not.toContain('Iniciar sesión');
  });

  it('el correo de ayuda sale de la constante compartida', () => {
    const { html } = crear();
    const enlace = html.querySelector(`a[href="mailto:${CORREO_CONTACTO_AYUDA}"]`);
    expect(enlace?.textContent?.trim()).toBe(CORREO_CONTACTO_AYUDA);
  });

  it('pone el título de la pestaña del navegador', () => {
    crear();
    expect(TestBed.inject(Title).getTitle()).toBe(TITULO_PAGINA_HOME);
    expect(TITULO_PAGINA_HOME).toBe('TRAINET — Plataforma LMS para PYMEs');
  });

  it('las tarjetas informativas no son enfocables ni interactivas', () => {
    const { html } = crear();
    const tarjetas = html.querySelectorAll('#sobre-trainet li, #funciones li, #roles li, #triny li');
    expect(tarjetas.length).toBe(3 + 6 + 11 + 3);
    for (const tarjeta of Array.from(tarjetas)) {
      expect(tarjeta.hasAttribute('tabindex')).toBe(false);
      expect(tarjeta.hasAttribute('role')).toBe(false);
      expect(tarjeta.querySelector('a, button, [tabindex], [role="button"]')).toBeNull();
    }
  });

  it('los enlaces ancla son nativos: href al id y sin handler que cancele la navegación', () => {
    const { html } = crear();
    const enlaces = Array.from(html.querySelectorAll<HTMLAnchorElement>('a[href^="/#"]'));
    expect(enlaces.length).toBe(9);
    for (const enlace of enlaces) {
      const id = enlace.getAttribute('href')?.slice(2) ?? '';
      expect(html.querySelector(`section#${id}`), id).not.toBeNull();
      const evento = new MouseEvent('click', { bubbles: true, cancelable: true });
      enlace.dispatchEvent(evento);
      expect(evento.defaultPrevented, id).toBe(false);
    }
  });

  describe('vista del producto', () => {
    it('tablist accesible con Dashboard seleccionado al inicio', () => {
      const { html } = crear();
      const lista = html.querySelector('[role="tablist"]') as HTMLElement;
      expect(lista.getAttribute('aria-label')).toBeTruthy();
      expect(textos(html.querySelectorAll('[role="tab"]'))).toEqual(['Dashboard', 'Capacitación', 'Triny', 'Usuarios']);
      expect(pestanas(html).map(p => p.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false', 'false']);
      expect(pestanas(html).map(p => p.tabIndex)).toEqual([0, -1, -1, -1]);
      const panel = html.querySelector('[role="tabpanel"]') as HTMLElement;
      expect(panel.getAttribute('aria-labelledby')).toBe('pestana-dashboard');
      expect(imagenDelProducto(html)?.getAttribute('src')).toContain(CAPTURAS_PRODUCTO[0].ruta);
    });

    it('al elegir una pestaña cambia la imagen y el panel', () => {
      const { fixture, html } = crear();
      pestanas(html)[1].click();
      fixture.detectChanges();
      expect(pestanas(html)[1].getAttribute('aria-selected')).toBe('true');
      expect(pestanas(html)[0].getAttribute('aria-selected')).toBe('false');
      expect(imagenDelProducto(html)?.getAttribute('src')).toContain('capacitacion.webp');
      expect(html.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe('pestana-capacitacion');
    });

    it('las flechas izquierda y derecha mueven la selección y el foco, con vuelta al extremo', () => {
      const { fixture, html } = crear();
      document.body.appendChild(html);
      const tecla = (key: string) => {
        (document.activeElement ?? pestanas(html)[0]).dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
        fixture.detectChanges();
      };
      pestanas(html)[0].focus();

      tecla('ArrowRight');
      expect(pestanas(html)[1].getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(pestanas(html)[1]);
      expect(imagenDelProducto(html)?.getAttribute('src')).toContain('capacitacion.webp');

      tecla('ArrowLeft');
      tecla('ArrowLeft');
      expect(pestanas(html)[3].getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(pestanas(html)[3]);

      tecla('ArrowRight');
      expect(pestanas(html)[0].getAttribute('aria-selected')).toBe('true');

      tecla('End');
      expect(pestanas(html)[3].getAttribute('aria-selected')).toBe('true');
      tecla('Home');
      expect(pestanas(html)[0].getAttribute('aria-selected')).toBe('true');
      html.remove();
    });

    it('"Capturas reales del sistema." aparece solo cuando la imagen cargó', () => {
      const { fixture, html } = crear();
      expect(html.textContent).not.toContain('Capturas reales del sistema.');

      imagenDelProducto(html)?.dispatchEvent(new Event('load'));
      fixture.detectChanges();
      expect(html.textContent).toContain('Capturas reales del sistema.');

      // Al cambiar de pestaña se reinicia hasta que cargue la nueva imagen.
      pestanas(html)[2].click();
      fixture.detectChanges();
      expect(html.textContent).not.toContain('Capturas reales del sistema.');

      imagenDelProducto(html)?.dispatchEvent(new Event('error'));
      fixture.detectChanges();
      expect(html.textContent).not.toContain('Capturas reales del sistema.');
      expect(html.querySelector('#panel-producto .fp-marcador')?.textContent).toContain('Triny');
      expect(imagenDelProducto(html)).toBeNull();
    });
  });

  it('la sección de Triny muestra su captura (o el marcador si falta)', () => {
    const { fixture, html } = crear();
    const imagen = html.querySelector('#triny img') as HTMLImageElement;
    expect(imagen.getAttribute('src')).toContain('triny.webp');
    imagen.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(html.querySelector('#triny img')).toBeNull();
    expect(html.querySelector('#triny .fp-marcador')).not.toBeNull();
  });
});

describe('rutas de la landing', () => {
  it('/home redirige a la landing conservando el fragmento', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/home#sobre-trainet');
    expect(router.url).toBe('/#sobre-trainet');
  });
});
