import { TestBed } from '@angular/core/testing';
import { NEVER, of } from 'rxjs';
import { InformeDetalle } from '../../../modelos/reportes';
import { ReportesService } from '../../../servicios/reportes';
import { DetalleInforme } from './detalle-informe';

describe('DetalleInforme: menú de descarga', () => {
  it('muestra un único botón "Descargar" con los tres formatos y lanza la descarga existente', async () => {
    const exportarInforme = vi.fn(() => NEVER);
    const detalle = {
      id: 5, titulo: 'Informe', fo_tipo_reporte: 1, tipo_nombre: 'Soporte', tipo_clave: 'soporte',
      fecha_generacion: '2026-01-15', fo_usuario: 1, usuario_nombre: 'Ana', parametros: {}, total_archivos: 0,
      contenido: { indicadores: [], graficos: [], tablas: [], secciones: [], notas: [] }, archivos: []
    } as unknown as InformeDetalle;
    TestBed.configureTestingModule({
      providers: [{ provide: ReportesService, useValue: { obtenerInforme: () => of(detalle), exportarInforme } }]
    });
    const fixture = TestBed.createComponent(DetalleInforme);
    fixture.componentRef.setInput('informeId', 5);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);

    expect(html.querySelectorAll('app-menu-descarga').length).toBe(1);
    const boton = html.querySelector('button.menu-boton') as HTMLButtonElement;
    boton.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const opciones = Array.from(html.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    expect(opciones.map(o => o.textContent?.trim())).toEqual(['PDF', 'Excel', 'Word']);
    opciones[2].click();
    fixture.detectChanges();
    expect(exportarInforme).toHaveBeenCalledWith(5, 'docx');
    expect(boton.disabled).toBe(true);
    expect(boton.textContent).toContain('Descargando…');
    document.body.replaceChildren();
  });
});
