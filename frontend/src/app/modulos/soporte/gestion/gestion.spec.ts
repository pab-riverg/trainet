import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { TicketSoporte } from '../../../modelos/soporte';
import { SoporteService } from '../../../servicios/soporte';
import { GestionTickets } from './gestion';

const ticket = (id: number): TicketSoporte => ({
  id, fecha_creacion: '2026-01-01', prioridad: 'media', descripcion: `Ticket ${id}`, estado: 'abierto', observaciones: '',
  tiempo_resolucion: 0, fecha_resolucion: null, fo_categoria_ticket: 1, fo_tecnico: null, fo_usuario: 1, fo_mod_soporte: 1,
  categoria_nombre: 'Hardware', usuario_nombre: 'Ana', tecnico_nombre: null
});

describe('Gestión de tickets: paginación', () => {
  it('página 1 con 10 filas, página 2 con el resto, y el resumen usa la lista completa', () => {
    const todos = Array.from({ length: 23 }, (_, i) => ticket(i + 1));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SoporteService, useValue: { listarTickets: () => of(todos), listarCategorias: () => of([]) } }
      ]
    });
    const fixture = TestBed.createComponent(GestionTickets);
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    const ids = () => Array.from(html.querySelectorAll('tbody tr td:first-child')).map(td => td.textContent?.trim());

    expect(ids()).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(fixture.componentInstance.totalAbiertos()).toBe(23);

    (html.querySelector('button[aria-label="Ir a la página 3"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(ids()).toEqual(['21', '22', '23']);
    document.body.replaceChildren();
  });
});
