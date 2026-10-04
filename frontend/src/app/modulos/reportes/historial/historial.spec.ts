import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { InformeLista } from '../../../modelos/reportes';
import { ReportesService } from '../../../servicios/reportes';
import { HistorialInformes } from './historial';

const informe = (id: number): InformeLista => ({
  id, titulo: `Informe ${id}`, fo_tipo_reporte: 1, tipo_nombre: 'Soporte', tipo_clave: 'soporte',
  fecha_generacion: '2026-01-15', fo_usuario: 1, usuario_nombre: 'Ana', parametros: {}, total_archivos: 0
} as InformeLista);

describe('HistorialInformes: menú de descarga', () => {
  function crear() {
    const exportarInforme = vi.fn(() => NEVER);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), {
        provide: ReportesService,
        useValue: { listarInformes: () => of([informe(1), informe(2)]), listarTipos: () => of([]), exportarInforme }
      }]
    });
    const fixture = TestBed.createComponent(HistorialInformes);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    return { fixture, html: fixture.nativeElement as HTMLElement, exportarInforme };
  }

  afterEach(() => document.body.replaceChildren());

  it('cada fila tiene un único botón "Descargar" (no un botón por formato)', () => {
    const { html } = crear();
    expect(html.querySelectorAll('app-menu-descarga').length).toBe(2);
    expect(Array.from(html.querySelectorAll('button.menu-boton')).every(b => b.textContent?.includes('Descargar'))).toBe(true);
    expect(html.textContent).not.toContain('Word');
  });

  it('elegir un formato usa la descarga existente y bloquea las demás mientras dura', async () => {
    const { fixture, html, exportarInforme } = crear();
    const botones = Array.from(html.querySelectorAll<HTMLButtonElement>('button.menu-boton'));
    botones[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    const opciones = Array.from(html.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    expect(opciones.map(o => o.textContent?.trim())).toEqual(['PDF', 'Excel', 'Word']);
    opciones[1].click();
    fixture.detectChanges();

    expect(exportarInforme).toHaveBeenCalledTimes(1);
    expect(exportarInforme).toHaveBeenCalledWith(1, 'xlsx');
    // La fila en descarga muestra "Descargando…" y las dos quedan deshabilitadas.
    expect(botones[0].textContent).toContain('Descargando…');
    expect(botones.every(b => b.disabled)).toBe(true);
  });
});
