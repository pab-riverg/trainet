import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { ConsultaFrecuente } from '../../modelos/asistente';
import { ModuloMenu } from '../../modelos/inicio';
import { AsistenteService } from '../../servicios/asistente';
import { InicioService } from '../../servicios/inicio';
import { CORREO_CONTACTO_AYUDA } from '../../utilidades/ayuda';
import { Ayuda } from './ayuda';

const pregunta = (id: number, texto: string, respuesta: string): ConsultaFrecuente => ({
  id, pregunta: texto, respuesta, fo_categoria: null, categoria_nombre: null, categoria_icono: null,
  palabras_clave: '', archivo: null, archivo_nombre: null, activa: true, fo_mod_asistente: 1
});

const modulo = (clave: string, titulo: string): ModuloMenu =>
  ({ clave, titulo, ruta: `/${clave}`, icono: 'bi-x', seccion: 'gestion' });

describe('Ayuda', () => {
  function crear(modulos: ModuloMenu[], consultas: Observable<ConsultaFrecuente[]>) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AsistenteService, useValue: { listarConsultas: () => consultas } },
        { provide: InicioService, useValue: { modulos: signal(modulos), cargar: () => undefined } }
      ]
    });
    const fixture = TestBed.createComponent(Ayuda);
    fixture.detectChanges();
    return { fixture, html: fixture.nativeElement as HTMLElement };
  }

  const FAQ = of([
    pregunta(1, '¿Cómo cambio mi contraseña?', 'Desde tu perfil.'),
    pregunta(2, '¿Cómo reporto un problema?', 'Crea un ticket en Soporte.')
  ]);

  it('lista las preguntas como desplegables y filtra por pregunta y respuesta sin tildes', () => {
    const { fixture, html } = crear([], FAQ);
    expect(html.querySelectorAll('details').length).toBe(2);

    const buscador = html.querySelector('#ayuda-buscar') as HTMLInputElement;
    buscador.value = 'CONTRASENA';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(html.querySelectorAll('details').length).toBe(1);

    buscador.value = 'ticket';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(html.querySelector('summary')?.textContent).toContain('reporto un problema');
  });

  it('sin coincidencias muestra "No encontramos resultados"', () => {
    const { fixture, html } = crear([], FAQ);
    const buscador = html.querySelector('#ayuda-buscar') as HTMLInputElement;
    buscador.value = 'zzzz';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(html.textContent).toContain('No encontramos resultados');
    expect(html.querySelectorAll('details').length).toBe(0);
  });

  it('muestra el error de carga', () => {
    const { html } = crear([], throwError(() => new Error('x')));
    expect(html.textContent).toContain('No se pudieron cargar las preguntas frecuentes.');
  });

  it('la guía lista los módulos del rol con descripción y enlace, y un módulo sin descripción solo el nombre', () => {
    const { html } = crear([modulo('soporte', 'Soporte técnico'), modulo('inventado', 'Módulo nuevo'), modulo('ayuda', 'Ayuda')], FAQ);
    const guia = Array.from(html.querySelectorAll('.ayuda-modulo'));
    expect(guia.map(a => a.getAttribute('href'))).toEqual(['/soporte', '/inventado']);
    expect(guia[0].textContent).toContain('Reporta problemas y sigue tus tickets.');
    expect(guia[1].querySelectorAll('.ayuda-modulo-texto span').length).toBe(0);
  });

  it('el acceso a Soporte solo aparece si el rol tiene ese módulo', () => {
    expect(crear([modulo('soporte', 'Soporte técnico')], FAQ).html.textContent).toContain('Ir a Soporte técnico');
    TestBed.resetTestingModule();
    const { html } = crear([modulo('compras', 'Compras internas')], FAQ);
    expect(html.textContent).not.toContain('Ir a Soporte técnico');
    expect(html.textContent).toContain('Preguntarle a Triny');
  });

  it('el contacto es un mailto con la constante única', () => {
    const { html } = crear([], FAQ);
    expect(html.querySelector(`a[href="mailto:${CORREO_CONTACTO_AYUDA}"]`)).not.toBeNull();
    expect(CORREO_CONTACTO_AYUDA).toBe('contactoayuda@trainet.com');
  });
});
