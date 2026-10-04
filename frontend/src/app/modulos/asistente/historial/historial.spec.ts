import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { HistorialConsulta } from '../../../modelos/asistente';
import { AsistenteService } from '../../../servicios/asistente';
import { HistorialAsistente } from './historial';

const fila = (id: number): HistorialConsulta => ({
  id, fo_usuario: 1, usuario_nombre: 'Ana', texto: `Consulta ${id}`, origen: 'texto', consulta: null,
  consulta_pregunta: null, resuelta: true, util: null, fecha: '2026-01-01T10:00:00Z'
} as HistorialConsulta);

describe('Historial del asistente: paginación', () => {
  it('reemplaza "Mostrar más" por el paginador: página 1 con 10 filas y página 2 con el resto', () => {
    const todas = Array.from({ length: 12 }, (_, i) => fila(i + 1));
    TestBed.configureTestingModule({
      providers: [{ provide: AsistenteService, useValue: { listarHistorial: () => of(todas) } }]
    });
    const fixture = TestBed.createComponent(HistorialAsistente);
    fixture.componentRef.setInput('modo', 'global');
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    const filas = () => html.querySelectorAll('tbody tr').length;

    expect(filas()).toBe(10);
    expect(html.textContent).not.toContain('Mostrar más');
    (html.querySelector('button[aria-label="Ir a la página 2"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(filas()).toBe(2);
    document.body.replaceChildren();
  });
});
