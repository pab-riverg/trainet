import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ComprasService } from '../../../../servicios/compras';
import { SeccionFacturas } from './seccion-facturas';

const factura = { id: 1, archivo: '/media/f.pdf', descripcion: 'Factura 1', fecha_carga: '2026-02-02T10:00:00Z', fo_solicitud: 7, usuario_nombre: 'Ana' };

describe('SeccionFacturas: eliminar factura', () => {
  function crear(estado: string, rol: string) {
    localStorage.setItem('trainet_rol', rol);
    TestBed.configureTestingModule({ providers: [{ provide: ComprasService, useValue: { listarFacturas: () => of([factura]) } }] });
    const fixture = TestBed.createComponent(SeccionFacturas);
    fixture.componentRef.setInput('solicitud', { id: 7, estado });
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => localStorage.removeItem('trainet_rol'));

  const botonEliminar = (html: HTMLElement) => html.querySelector('[aria-label="Eliminar factura"], app-boton-accion[etiqueta="Eliminar factura"]');

  it('se ofrece en una solicitud comprada a quien gestiona compras', () => {
    expect(botonEliminar(crear('comprada', 'administrador'))).not.toBeNull();
  });

  it('no se ofrece cuando la solicitud ya está recibida', () => {
    const html = crear('recibida', 'administrador');
    expect(html.textContent).toContain('Factura 1');
    expect(botonEliminar(html)).toBeNull();
  });

  it('no se ofrece a quien no gestiona compras', () => {
    expect(botonEliminar(crear('comprada', 'empleado'))).toBeNull();
  });
});
