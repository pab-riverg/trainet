import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SolicitudCompra } from '../../../modelos/compras';
import { ComprasService } from '../../../servicios/compras';
import { ListaSolicitudes } from './solicitudes';

const solicitud = (id: number) => ({
  id, fecha_solicitud: '2026-01-01', solicitante_nombre: 'Ana', area: `Área ${id}`, items: [], total_estimado: 1000,
  estado: 'pendiente'
} as unknown as SolicitudCompra);

describe('Lista de solicitudes de compra: paginación', () => {
  it('página 1 con 10 filas y página 2 con el resto', () => {
    const todas = Array.from({ length: 14 }, (_, i) => solicitud(i + 1));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ComprasService, useValue: { listarSolicitudes: () => of(todas), listarModuloCompras: () => of([]) } }
      ]
    });
    const fixture = TestBed.createComponent(ListaSolicitudes);
    fixture.componentRef.setInput('modo', 'propias');
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    const filas = () => html.querySelectorAll('tbody tr').length;

    expect(filas()).toBe(10);
    expect(html.textContent).toContain('Mostrando 1–10 de 14');
    (html.querySelector('button[aria-label="Ir a la página 2"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(filas()).toBe(4);
    document.body.replaceChildren();
  });
});
