import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { Auth } from '../../servicios/auth';
import { CORREO_CONTACTO_AYUDA } from '../../utilidades/ayuda';
import { CLAVE_TEMA_LOGIN, Login, MENSAJE_CREDENCIALES, MENSAJE_SERVIDOR } from './login';

describe('Login', () => {
  let autenticacion: Subject<unknown>;
  let loginAuth: ReturnType<typeof vi.fn>;

  function crear() {
    autenticacion = new Subject<unknown>();
    loginAuth = vi.fn(() => autenticacion);
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: Auth, useValue: { login: loginAuth } }] });
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    return { fixture, html, navegar, componente: fixture.componentInstance };
  }

  function escribir(html: HTMLElement, correo: string, password: string): void {
    const email = html.querySelector('#login-email') as HTMLInputElement;
    const pw = html.querySelector('#login-password') as HTMLInputElement;
    email.value = correo;
    email.dispatchEvent(new Event('input'));
    pw.value = password;
    pw.dispatchEvent(new Event('input'));
  }

  const enviar = (html: HTMLElement) => (html.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));

  afterEach(() => localStorage.removeItem(CLAVE_TEMA_LOGIN));

  it('un envío válido llama al login una sola vez y navega a /inicio', () => {
    const { html, navegar } = crear();
    escribir(html, 'ana@trainet.test', 'secreto');
    enviar(html);
    enviar(html); // doble envío mientras espera
    expect(loginAuth).toHaveBeenCalledTimes(1);
    expect(loginAuth).toHaveBeenCalledWith('ana@trainet.test', 'secreto');
    autenticacion.next({});
    expect(navegar).toHaveBeenCalledWith(['/inicio']);
  });

  it('un formulario inválido no llama al login y muestra los mensajes', () => {
    const { fixture, html } = crear();
    escribir(html, 'no-es-correo', '');
    enviar(html);
    fixture.detectChanges();
    expect(loginAuth).not.toHaveBeenCalled();
    expect(html.textContent).toContain('Ingresa un correo electrónico válido');
    expect(html.textContent).toContain('Este campo es obligatorio');
  });

  it('muestra "Ingresando…" y deshabilita el botón mientras espera', () => {
    const { fixture, html } = crear();
    escribir(html, 'ana@trainet.test', 'secreto');
    enviar(html);
    fixture.detectChanges();
    const boton = html.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(boton.disabled).toBe(true);
    expect(boton.textContent).toContain('Ingresando…');
    autenticacion.error(new HttpErrorResponse({ status: 401 }));
    fixture.detectChanges();
    expect(boton.disabled).toBe(false);
  });

  it('credenciales incorrectas (401) y error de servidor (0, 429, 500) muestran mensajes distintos con role="alert"', () => {
    for (const [estado, esperado] of [[401, MENSAJE_CREDENCIALES], [400, MENSAJE_CREDENCIALES],
      [0, MENSAJE_SERVIDOR], [429, MENSAJE_SERVIDOR], [500, MENSAJE_SERVIDOR]] as const) {
      TestBed.resetTestingModule();
      const { fixture, html } = crear();
      escribir(html, 'ana@trainet.test', 'secreto');
      enviar(html);
      autenticacion.error(new HttpErrorResponse({ status: estado }));
      fixture.detectChanges();
      const alerta = html.querySelector('[role="alert"]');
      expect(alerta?.textContent?.trim(), String(estado)).toBe(esperado);
    }
  });

  it('el ojo alterna el tipo del campo con aria-label y aria-pressed', () => {
    const { fixture, html } = crear();
    const campo = html.querySelector('#login-password') as HTMLInputElement;
    const boton = html.querySelector('.toggle-pw') as HTMLButtonElement;
    expect(campo.type).toBe('password');
    expect(boton.getAttribute('aria-label')).toBe('Mostrar contraseña');
    boton.click();
    fixture.detectChanges();
    expect(campo.type).toBe('text');
    expect(boton.getAttribute('aria-label')).toBe('Ocultar contraseña');
    expect(boton.getAttribute('aria-pressed')).toBe('true');
  });

  it('los campos tienen label asociado y autocomplete', () => {
    const { html } = crear();
    expect(html.querySelector('label[for="login-email"]')).not.toBeNull();
    expect(html.querySelector('label[for="login-password"]')).not.toBeNull();
    expect(html.querySelector('#login-email')?.getAttribute('autocomplete')).toBe('username');
    expect(html.querySelector('#login-password')?.getAttribute('autocomplete')).toBe('current-password');
  });

  describe('diálogo de ayuda', () => {
    const dialogo = (html: HTMLElement) => html.querySelector('[role="dialog"]');

    it('abre con la burbuja, enfoca "Cerrar" y cierra con el botón devolviendo el foco', async () => {
      const { fixture, html } = crear();
      const burbuja = html.querySelector('.help-bubble') as HTMLButtonElement;
      burbuja.focus();
      burbuja.click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(dialogo(html)?.getAttribute('aria-modal')).toBe('true');
      expect(dialogo(html)?.getAttribute('aria-labelledby')).toBe('login-ayuda-titulo');
      expect(html.textContent).toContain('¿Necesitas ayuda?');
      expect(html.querySelector(`[role="dialog"] a[href="mailto:${CORREO_CONTACTO_AYUDA}"]`)).not.toBeNull();
      expect(document.activeElement?.textContent).toContain('Cerrar');

      (html.querySelector('.login-modal-cerrar') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(dialogo(html)).toBeNull();
    });

    it('el enlace "Comunícate aquí" abre el mismo diálogo', () => {
      const { fixture, html } = crear();
      (html.querySelector('.login-enlace') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(dialogo(html)).not.toBeNull();
    });

    it('Escape y clic en el fondo cierran', () => {
      const { fixture, html } = crear();
      const burbuja = html.querySelector('.help-bubble') as HTMLButtonElement;
      burbuja.click();
      fixture.detectChanges();
      (html.querySelector('.login-modal-fondo') as HTMLElement).dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(dialogo(html)).toBeNull();

      burbuja.click();
      fixture.detectChanges();
      (html.querySelector('.login-modal-fondo') as HTMLElement).click();
      fixture.detectChanges();
      expect(dialogo(html)).toBeNull();

      // Un clic dentro del diálogo no lo cierra.
      burbuja.click();
      fixture.detectChanges();
      (html.querySelector('.login-modal') as HTMLElement).click();
      fixture.detectChanges();
      expect(dialogo(html)).not.toBeNull();
    });
  });

  describe('interruptor claro/noche', () => {
    it('arranca en noche, guarda en la clave propia y no toca data-theme', () => {
      const { fixture, html } = crear();
      const pagina = html.querySelector('.login-pagina') as HTMLElement;
      expect(pagina.classList).not.toContain('login-claro');
      (html.querySelector('.login-tema') as HTMLButtonElement).click();
      fixture.detectChanges();
      expect(localStorage.getItem(CLAVE_TEMA_LOGIN)).toBe('claro');
      expect(pagina.classList).toContain('login-claro');
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
      expect(localStorage.getItem('trainet_modo_oscuro')).toBeNull();
    });

    it('aplica el valor guardado desde el primer render', () => {
      localStorage.setItem(CLAVE_TEMA_LOGIN, 'claro');
      const { html } = crear();
      expect(html.querySelector('.login-pagina')?.classList).toContain('login-claro');
    });
  });

  describe('barra superior', () => {
    const enlace = (html: HTMLElement, texto: string) =>
      Array.from(html.querySelectorAll<HTMLAnchorElement>('.topbar-nav a')).find(a => a.textContent?.trim() === texto);

    it('"Sobre Trainet" navega a la landing con el fragmento sobre-trainet', () => {
      const { html } = crear();
      const navegarUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
      const sobre = enlace(html, 'Sobre Trainet') as HTMLAnchorElement;
      expect(sobre.getAttribute('href')).toBe('/#sobre-trainet');
      sobre.click();
      const destino = navegarUrl.mock.calls[0][0] as UrlTree;
      expect(TestBed.inject(Router).serializeUrl(destino)).toBe('/#sobre-trainet');
    });

    it('"Inicio" sigue llevando a la landing sin fragmento', () => {
      const { html } = crear();
      expect(enlace(html, 'Inicio')?.getAttribute('href')).toBe('/');
    });
  });

  it('"Ingresa Ahora" enfoca el campo de correo y no hay registro ni recuérdame', () => {
    const { html } = crear();
    document.body.appendChild(html);
    (html.querySelector('.btn-ingresa') as HTMLButtonElement).click();
    expect(document.activeElement?.id).toBe('login-email');
    expect(html.textContent).not.toContain('Regístrate');
    expect(html.textContent).not.toContain('Recuérdame');
    expect(html.textContent).not.toContain('Ingreso Corporativo');
    html.remove();
  });
});
