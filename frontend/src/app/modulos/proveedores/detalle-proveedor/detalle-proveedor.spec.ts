import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Proveedor } from '../../../modelos/proveedores';
import { ProveedoresService } from '../../../servicios/proveedores';
import { DetalleProveedor } from './detalle-proveedor';

const elemento = (id: number) => new Proxy({ id }, {
  get: (o, k) => {
    if (typeof k === 'symbol' || k === 'then' || k === 'toJSON') {
      return undefined;
    }
    if (k in o) {
      return (o as Record<string, unknown>)[k];
    }
    return /fecha/i.test(String(k)) ? '2026-01-15T10:00:00Z' : '';
  }
});
const lista = (n: number) => Array.from({ length: n }, (_, i) => elemento(i + 1));

describe('Detalle de proveedor: listas paginadas', () => {
  it('cotizaciones y acuerdos anteriores paginan por separado, cada una con su página', () => {
    localStorage.setItem('trainet_rol', 'administrador');
    TestBed.configureTestingModule({
      providers: [{
        provide: ProveedoresService,
        useValue: new Proxy({}, {
          get: (_, nombre) => {
            if (nombre === 'listarCotizaciones') {
              return () => of(lista(12));
            }
            if (nombre === 'historialProveedor') {
              return () => of(lista(25));
            }
            return () => of([]);
          }
        })
      }]
    });
    const fixture = TestBed.createComponent(DetalleProveedor);
    fixture.componentRef.setInput('proveedor', { id: 1, razon_social: 'Acme', estado: 'contratado' } as unknown as Proveedor);
    const html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    fixture.detectChanges();

    const componente = fixture.componentInstance;
    expect(componente.paginacionCotizaciones.visibles().length).toBe(10);
    expect(componente.paginacionAcuerdos.visibles().length).toBe(10);

    componente.paginacionCotizaciones.irA(2);
    componente.paginacionAcuerdos.irA(3);
    fixture.detectChanges();
    expect(componente.paginacionCotizaciones.visibles().length).toBe(2);
    expect(componente.paginacionAcuerdos.visibles().length).toBe(5);
    expect(componente.paginacionCotizaciones.pagina()).toBe(2);
    expect(componente.paginacionAcuerdos.pagina()).toBe(3);

    document.body.replaceChildren();
    localStorage.clear();
  });
});
