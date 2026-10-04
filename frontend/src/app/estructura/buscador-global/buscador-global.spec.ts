import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Subject } from 'rxjs';
import { RespuestaBusqueda } from '../../modelos/busqueda';
import { BusquedaService } from '../../servicios/busqueda';
import { BuscadorGlobal } from './buscador-global';

const RESPUESTA: RespuestaBusqueda = {
  q: 'zafiro',
  total: 3,
  grupos: [
    {
      modulo: 'soporte', titulo: 'Soporte técnico', icono: 'bi-headset', ruta: '/soporte',
      resultados: [
        { titulo: 'Ticket zafiro uno', subtitulo: 'Hardware', estado: 'Abierto', ruta: '/soporte?vista=reportar&q=zafiro' },
        { titulo: 'Ticket zafiro dos', subtitulo: 'Red', ruta: '/soporte?vista=reportar&q=zafiro' }
      ]
    },
    {
      modulo: 'documentos', titulo: 'Documentos', icono: 'bi-folder2-open', ruta: '/documentos',
      resultados: [{ titulo: 'Manual', subtitulo: 'Guías', ruta: '/documentos?q=zafiro' }]
    }
  ]
};

describe('BuscadorGlobal', () => {
  let peticiones: { texto: string; respuesta: Subject<RespuestaBusqueda> }[];
  let navegar: ReturnType<typeof vi.fn>;

  function crear() {
    peticiones = [];
    navegar = vi.fn(() => Promise.resolve(true));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: BusquedaService,
          useValue: {
            buscar: (texto: string) => {
              const respuesta = new Subject<RespuestaBusqueda>();
              peticiones.push({ texto, respuesta });
              return respuesta;
            }
          }
        }
      ]
    });
    TestBed.inject(Router).navigateByUrl = navegar as unknown as Router['navigateByUrl'];
    const fixture = TestBed.createComponent(BuscadorGlobal);
    fixture.detectChanges();
    return { fixture, buscador: fixture.componentInstance, html: fixture.nativeElement as HTMLElement };
  }

  function teclear(buscador: BuscadorGlobal, tecla: string): void {
    buscador.alTeclear(new KeyboardEvent('keydown', { key: tecla }));
  }

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('no consulta con menos de 2 caracteres y espera ~300 ms tras escribir', () => {
    const { buscador } = crear();
    buscador.texto.setValue('a');
    vi.advanceTimersByTime(1000);
    expect(peticiones.length).toBe(0);

    buscador.texto.setValue('ab');
    vi.advanceTimersByTime(299);
    expect(peticiones.length).toBe(0);
    vi.advanceTimersByTime(2);
    expect(peticiones.map(p => p.texto)).toEqual(['ab']);
  });

  it('descarta la respuesta de una búsqueda anterior (switchMap)', () => {
    const { buscador } = crear();
    buscador.texto.setValue('ab');
    vi.advanceTimersByTime(300);
    buscador.texto.setValue('abc');
    vi.advanceTimersByTime(300);
    expect(peticiones.length).toBe(2);

    peticiones[0].respuesta.next({ ...RESPUESTA, q: 'ab' });
    expect(buscador.grupos()).toEqual([]);
    peticiones[1].respuesta.next(RESPUESTA);
    expect(buscador.grupos().length).toBe(2);
    expect(buscador.estado()).toBe('listo');
  });

  it('muestra los resultados agrupados con roles de combobox/listbox y estado', () => {
    const { fixture, buscador, html } = crear();
    buscador.texto.setValue('zafiro');
    vi.advanceTimersByTime(300);
    peticiones[0].respuesta.next(RESPUESTA);
    fixture.detectChanges();

    expect(html.querySelector('input')?.getAttribute('role')).toBe('combobox');
    expect(html.querySelector('input')?.getAttribute('aria-expanded')).toBe('true');
    expect(html.querySelectorAll('[role="group"]').length).toBe(2);
    expect(html.querySelectorAll('[role="option"]').length).toBe(3);
    expect(html.querySelector('mark')?.textContent).toBe('zafiro');
    expect(html.textContent).toContain('Abierto');
  });

  it('muestra "Sin resultados" y el error', () => {
    const { fixture, buscador, html } = crear();
    buscador.texto.setValue('nada');
    vi.advanceTimersByTime(300);
    peticiones[0].respuesta.next({ q: 'nada', total: 0, grupos: [] });
    fixture.detectChanges();
    expect(html.textContent).toContain('Sin resultados para «nada»');

    buscador.texto.setValue('falla');
    vi.advanceTimersByTime(300);
    peticiones[1].respuesta.error(new Error('x'));
    fixture.detectChanges();
    expect(buscador.estado()).toBe('error');
    expect(html.textContent).toContain('No se pudo realizar la búsqueda.');
  });

  it('las flechas mueven la selección (con vuelta) y actualizan aria-activedescendant', () => {
    const { fixture, buscador, html } = crear();
    buscador.texto.setValue('zafiro');
    vi.advanceTimersByTime(300);
    peticiones[0].respuesta.next(RESPUESTA);

    teclear(buscador, 'ArrowDown');
    expect(buscador.activo()).toBe(0);
    teclear(buscador, 'ArrowDown');
    teclear(buscador, 'ArrowDown');
    expect(buscador.activo()).toBe(2);
    teclear(buscador, 'ArrowDown');
    expect(buscador.activo()).toBe(0);
    teclear(buscador, 'ArrowUp');
    expect(buscador.activo()).toBe(2);
    fixture.detectChanges();
    expect(html.querySelector('input')?.getAttribute('aria-activedescendant')).toBe('buscador-opcion-2');
  });

  it('Enter abre el resultado marcado, navega, cierra y limpia el texto', () => {
    const { buscador } = crear();
    buscador.texto.setValue('zafiro');
    vi.advanceTimersByTime(300);
    peticiones[0].respuesta.next(RESPUESTA);

    teclear(buscador, 'ArrowDown');
    teclear(buscador, 'ArrowDown');
    teclear(buscador, 'ArrowDown');
    teclear(buscador, 'Enter');
    expect(navegar).toHaveBeenCalledWith('/documentos?q=zafiro');
    expect(buscador.texto.value).toBe('');
    expect(buscador.panelVisible()).toBe(false);
  });

  it('Esc cierra y limpia', () => {
    const { buscador } = crear();
    buscador.texto.setValue('zafiro');
    vi.advanceTimersByTime(300);
    peticiones[0].respuesta.next(RESPUESTA);
    teclear(buscador, 'Escape');
    expect(buscador.texto.value).toBe('');
    expect(buscador.panelVisible()).toBe(false);
    vi.advanceTimersByTime(300);
    expect(buscador.grupos()).toEqual([]);
  });

  it('el clic fuera cierra el panel', () => {
    const { buscador } = crear();
    buscador.texto.setValue('zafiro');
    vi.advanceTimersByTime(300);
    peticiones[0].respuesta.next(RESPUESTA);
    expect(buscador.panelVisible()).toBe(true);
    buscador.alHacerClickEnDocumento(new MouseEvent('click'));
    expect(buscador.panelVisible()).toBe(false);
  });

  it('no navega si la ruta del resultado no tiene la forma esperada', () => {
    const { buscador } = crear();
    buscador.abrir({ titulo: 'x', subtitulo: '', ruta: 'javascript:alert(1)' });
    buscador.abrir({ titulo: 'x', subtitulo: '', ruta: '/soporte/12' });
    expect(navegar).not.toHaveBeenCalled();
  });

  describe('versión compacta (< 768px)', () => {
    it('arranca plegado: la lupa está disponible y el campo no está expandido', () => {
      const { fixture, html } = crear();
      const abrir = html.querySelector<HTMLButtonElement>('.buscador-abrir')!;
      expect(abrir.getAttribute('aria-expanded')).toBe('false');
      expect(abrir.getAttribute('aria-controls')).toBe('buscador-entrada');
      expect(html.querySelector('.topbar-search')?.classList.contains('expandido')).toBe(false);
      expect(fixture.componentInstance.expandido()).toBe(false);
    });

    it('al pulsar la lupa se expande y el foco pasa al campo', () => {
      const { fixture, html } = crear();
      html.querySelector<HTMLButtonElement>('.buscador-abrir')!.click();
      fixture.detectChanges();
      expect(html.querySelector('.topbar-search')?.classList.contains('expandido')).toBe(true);
      expect(html.querySelector('.buscador-abrir')?.getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(html.querySelector('#buscador-entrada'));
    });

    it('el botón cerrar pliega, borra el texto y devuelve el foco a la lupa', () => {
      const { fixture, buscador, html } = crear();
      buscador.expandir();
      buscador.texto.setValue('zafiro');
      fixture.detectChanges();

      html.querySelector<HTMLButtonElement>('.buscador-cerrar')!.click();
      fixture.detectChanges();
      expect(buscador.expandido()).toBe(false);
      expect(buscador.texto.value).toBe('');
      expect(document.activeElement).toBe(html.querySelector('.buscador-abrir'));
    });

    it('Escape pliega el campo expandido y un clic fuera también', () => {
      const { fixture, buscador } = crear();
      buscador.expandir();
      fixture.detectChanges();
      teclear(buscador, 'Escape');
      expect(buscador.expandido()).toBe(false);

      buscador.expandir();
      buscador.alHacerClickEnDocumento(new MouseEvent('click'));
      expect(buscador.expandido()).toBe(false);
    });
  });
});
