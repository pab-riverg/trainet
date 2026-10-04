import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { EventoAuditoria } from '../../../modelos/administracion';
import { AdministracionService } from '../../../servicios/administracion';
import { Bitacora } from './bitacora';

const evento = (id: number) => ({
  id, fecha_hora: '2026-01-15T10:00:00Z', usuario_nombre: 'Ana', accion: 'login_ok', accion_etiqueta: 'Inicio de sesión',
  modulo_etiqueta: 'Autenticación', descripcion: 'x', ip: '127.0.0.1'
} as unknown as EventoAuditoria);

describe('Bitácora: paginación de servidor', () => {
  function crear() {
    const total = 25;
    const listarAuditoria = vi.fn((filtros?: { limit?: number; offset?: number }) => {
      const offset = filtros?.offset ?? 0;
      const limite = filtros?.limit ?? 10;
      const filas = Array.from({ length: Math.max(0, Math.min(limite, total - offset)) }, (_, i) => evento(offset + i + 1));
      return of({ count: total, next: null, previous: null, results: filas });
    });
    TestBed.configureTestingModule({
      providers: [{
        provide: AdministracionService,
        useValue: { listarAuditoria, listarCatalogoAuditoria: () => of({ acciones: [], modulos: [] }) }
      }]
    });
    const fixture = TestBed.createComponent(Bitacora);
    const html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    fixture.detectChanges();
    const irA = (n: number) => {
      (html.querySelector(`button[aria-label="Ir a la página ${n}"]`) as HTMLButtonElement).click();
      fixture.detectChanges();
    };
    return { fixture, html, listarAuditoria, irA };
  }

  afterEach(() => document.body.replaceChildren());

  it('pide la página 1 con limit 10 y offset 0 y muestra 10 filas y el paginador compartido', () => {
    const { html, listarAuditoria } = crear();
    expect(listarAuditoria).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 10, offset: 0 }));
    expect(html.querySelectorAll('tbody tr').length).toBe(10);
    expect(html.textContent).toContain('Mostrando 1–10 de 25');
    expect(html.querySelector('nav[aria-label="Paginación"]')).not.toBeNull();
  });

  it('no tiene selector de tamaño de página', () => {
    const { html } = crear();
    expect(html.querySelector('#bit-tamano')).toBeNull();
    expect(html.textContent).not.toContain('Filas por página');
  });

  it('cambiar de página pide al servidor offset = (página - 1) * 10', () => {
    const { html, listarAuditoria, irA } = crear();
    irA(2);
    expect(listarAuditoria).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 10, offset: 10 }));
    expect(html.querySelector('tbody tr td')).not.toBeNull();
    irA(3);
    expect(listarAuditoria).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 10, offset: 20 }));
    expect(html.querySelectorAll('tbody tr').length).toBe(5);
  });

  it('cambiar un filtro vuelve a la página 1', () => {
    const { fixture, listarAuditoria, irA } = crear();
    irA(3);
    fixture.componentInstance.filtrosForm.controls.accion.setValue('login_ok');
    fixture.detectChanges();
    expect(listarAuditoria).toHaveBeenLastCalledWith(expect.objectContaining({ accion: 'login_ok', limit: 10, offset: 0 }));
    expect(fixture.componentInstance.pagina()).toBe(1);
  });
});
