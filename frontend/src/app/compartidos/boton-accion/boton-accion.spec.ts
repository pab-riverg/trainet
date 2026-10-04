import { TestBed } from '@angular/core/testing';
import { ACCIONES_FILA, AccionFila, BotonAccion } from './boton-accion';

describe('BotonAccion', () => {
  function crear(entradas: Record<string, unknown>): HTMLElement {
    const fixture = TestBed.createComponent(BotonAccion);
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('cada acción sale del mapa único de iconos', () => {
    for (const accion of Object.keys(ACCIONES_FILA) as AccionFila[]) {
      const html = crear({ accion, etiqueta: 'Prueba' });
      expect(html.querySelector('i')?.classList).toContain(ACCIONES_FILA[accion].icono);
    }
    expect(ACCIONES_FILA.ver.icono).toBe('bi-eye');
    expect(ACCIONES_FILA.eliminar.icono).toBe('bi-trash');
  });

  it('es un botón type="button" con aria-label y title', () => {
    const boton = crear({ accion: 'editar', etiqueta: 'Editar curso', titulo: 'Editar' }).querySelector('button');
    expect(boton?.getAttribute('type')).toBe('button');
    expect(boton?.getAttribute('aria-label')).toBe('Editar curso');
    expect(boton?.getAttribute('title')).toBe('Editar');
  });

  it('el title cae en la etiqueta si no se indica', () => {
    expect(crear({ accion: 'ver', etiqueta: 'Ver ticket' }).querySelector('button')?.getAttribute('title')).toBe('Ver ticket');
  });

  it('deshabilitado desactiva el botón', () => {
    expect(crear({ accion: 'archivar', etiqueta: 'x', deshabilitado: true }).querySelector('button')?.disabled).toBe(true);
  });

  it('solo las acciones destructivas llevan la variante de peligro', () => {
    expect(crear({ accion: 'eliminar', etiqueta: 'x' }).querySelector('button')?.classList).toContain('peligro');
    expect(crear({ accion: 'editar', etiqueta: 'x' }).querySelector('button')?.classList).not.toContain('peligro');
  });

  it('con enlace es un <a> que abre en pestaña nueva de forma segura', () => {
    const enlace = crear({ accion: 'abrir', etiqueta: 'Abrir', enlace: 'https://ejemplo.test/v' }).querySelector('a');
    expect(enlace?.getAttribute('href')).toBe('https://ejemplo.test/v');
    expect(enlace?.getAttribute('target')).toBe('_blank');
    expect(enlace?.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
