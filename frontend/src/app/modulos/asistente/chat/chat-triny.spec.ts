import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, Subject, of } from 'rxjs';
import { CategoriaAsistente } from '../../../modelos/asistente';
import { AsistenteService } from '../../../servicios/asistente';
import { ChatTriny } from './chat-triny';

const TEMAS = ['Soporte técnico', 'Compras', 'Recursos', 'Capacitación', 'Documentos', 'Mi cuenta'];
const categoria = (id: number, nombre: string): CategoriaAsistente =>
  ({ id, nombre, icono: 'bi-headset', orden: id, total_consultas: 2 } as unknown as CategoriaAsistente);

describe('ChatTriny', () => {
  let respuesta: Subject<unknown>;
  let preguntar: ReturnType<typeof vi.fn>;
  let listarConsultas: ReturnType<typeof vi.fn>;

  function crear() {
    respuesta = new Subject<unknown>();
    preguntar = vi.fn(() => respuesta);
    listarConsultas = vi.fn(() => of([{ id: 9, pregunta: '¿Cómo reporto un problema?' }]));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AsistenteService,
          useValue: {
            listarCategorias: () => of(TEMAS.map((nombre, i) => categoria(i + 1, nombre))),
            listarConsultas, preguntar, seleccionar: () => NEVER
          }
        }
      ]
    });
    const fixture = TestBed.createComponent(ChatTriny);
    const html = fixture.nativeElement as HTMLElement;
    // En el documento antes del primer render: el foco inicial solo funciona con el elemento adjunto.
    document.body.appendChild(html);
    fixture.detectChanges();
    const campo = html.querySelector('#triny-texto') as HTMLTextAreaElement;
    const enviar = html.querySelector('button.triny-enviar') as HTMLButtonElement;
    const escribir = (texto: string) => {
      campo.value = texto;
      campo.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    };
    const pulsarEnter = (shift: boolean) => {
      const evento = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: shift, bubbles: true, cancelable: true });
      campo.dispatchEvent(evento);
      fixture.detectChanges();
      return evento;
    };
    return { fixture, html, campo, enviar, escribir, pulsarEnter };
  }

  afterEach(() => document.body.replaceChildren());

  it('con la conversación vacía muestra el estado inicial y lo oculta tras el primer envío', () => {
    const { fixture, html, escribir, pulsarEnter } = crear();
    expect(html.querySelector('.triny-inicio')).not.toBeNull();
    expect(html.textContent).toContain('Pregúntale a Triny');
    expect(html.textContent).toContain('¿En qué piensas hoy?');
    expect(html.querySelector('.triny-inicio-icono')?.classList).toContain('bi-robot');

    escribir('Hola');
    pulsarEnter(false);
    fixture.detectChanges();
    expect(html.querySelector('.triny-inicio')).toBeNull();
    expect(html.querySelectorAll('.triny-burbuja-usuario').length).toBe(1);
    expect(html.querySelector('[role="log"]')?.getAttribute('aria-live')).toBe('polite');
  });

  it('Enter envía y Shift+Enter no', () => {
    const { escribir, pulsarEnter } = crear();
    escribir('Primera línea');
    const conShift = pulsarEnter(true);
    expect(conShift.defaultPrevented).toBe(false);
    expect(preguntar).not.toHaveBeenCalled();

    const sinShift = pulsarEnter(false);
    expect(sinShift.defaultPrevented).toBe(true);
    expect(preguntar).toHaveBeenCalledTimes(1);
    expect(preguntar).toHaveBeenCalledWith('Primera línea');
  });

  it('enviar está deshabilitado con texto vacío o solo espacios y durante un envío (sin doble envío)', () => {
    const { fixture, enviar, escribir, pulsarEnter } = crear();
    expect(enviar.disabled).toBe(true);
    escribir('   ');
    expect(enviar.disabled).toBe(true);

    escribir('Hola');
    expect(enviar.disabled).toBe(false);
    pulsarEnter(false);
    fixture.detectChanges();
    expect(enviar.disabled).toBe(true);
    pulsarEnter(false);
    expect(preguntar).toHaveBeenCalledTimes(1);
  });

  it('el "+" abre el menú de seis temas; elegir uno ejecuta la misma lógica de siempre', async () => {
    const { fixture, html } = crear();
    const mas = html.querySelector('button.triny-mas') as HTMLButtonElement;
    expect(mas.getAttribute('aria-haspopup')).toBe('menu');
    expect(mas.getAttribute('aria-label')).toBe('Abrir temas');
    mas.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mas.getAttribute('aria-expanded')).toBe('true');
    const items = Array.from(html.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    expect(items.map(i => i.textContent?.trim())).toEqual(TEMAS);
    expect(document.activeElement).toBe(items[0]);

    items[1].click();
    fixture.detectChanges();
    expect(listarConsultas).toHaveBeenCalledWith({ categoria: 2, activa: true });
    expect(html.querySelector('[role="menu"]')).toBeNull();
    expect(html.querySelector('.triny-tema')?.textContent).toContain('¿Cómo reporto un problema?');
    expect(document.activeElement).toBe(mas);
  });

  it('las flechas se mueven por los temas y Escape cierra devolviendo el foco al "+"', async () => {
    const { fixture, html } = crear();
    const mas = html.querySelector('button.triny-mas') as HTMLButtonElement;
    mas.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const menu = html.querySelector('[role="menu"]') as HTMLElement;
    const items = Array.from(html.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[5]);

    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(html.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(mas);
  });

  it('el clic fuera cierra el menú', async () => {
    const { fixture, html } = crear();
    (html.querySelector('button.triny-mas') as HTMLButtonElement).click();
    fixture.detectChanges();
    document.body.click();
    fixture.detectChanges();
    expect(html.querySelector('[role="menu"]')).toBeNull();
  });

  it('la barra de entrada solo tiene "+" y enviar: no hay varita ni franja de temas', () => {
    const { html } = crear();
    expect(html.querySelectorAll('.triny-barra button').length).toBe(2);
    expect(html.querySelector('.bi-magic, .bi-stars, .bi-wand')).toBeNull();
    expect(html.querySelector('.triny-menu')).toBeNull();
  });

  it('el foco inicial queda en el campo de texto', async () => {
    const { fixture, campo } = crear();
    await fixture.whenStable();
    expect(document.activeElement).toBe(campo);
  });
});
