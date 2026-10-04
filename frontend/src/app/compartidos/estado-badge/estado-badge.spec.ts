import { TestBed } from '@angular/core/testing';
import { EstadoBadge } from './estado-badge';

describe('EstadoBadge', () => {
  function crear(entradas: Record<string, unknown>): HTMLElement {
    const fixture = TestBed.createComponent(EstadoBadge);
    for (const [nombre, valor] of Object.entries(entradas)) {
      fixture.componentRef.setInput(nombre, valor);
    }
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('.estado') as HTMLElement;
  }

  it('muestra el valor normalizado con la variante de su dominio', () => {
    const insignia = crear({ dominio: 'ticket', valor: 'en proceso' });
    expect(insignia.textContent).toBe('En proceso');
    expect(insignia.classList).toContain('estado-aviso');
  });

  it('la etiqueta cambia el texto sin cambiar la variante', () => {
    const insignia = crear({ dominio: 'compra', valor: 'en_revision', etiqueta: 'En revisión' });
    expect(insignia.textContent).toBe('En revisión');
    expect(insignia.classList).toContain('estado-aviso');
  });

  it('un valor desconocido es neutro y una variante forzada manda', () => {
    expect(crear({ dominio: 'ticket', valor: 'raro' }).classList).toContain('estado-neutro');
    expect(crear({ dominio: 'ticket', valor: 'abierto', variante: 'peligro' }).classList).toContain('estado-peligro');
  });

  it('siempre lleva texto', () => {
    expect(crear({ dominio: 'prioridad', valor: 'Alta' }).textContent?.trim()).not.toBe('');
  });
});

describe('EstadoBadge: estado de curso', () => {
  it('Planificado, En curso y Finalizado usan info, aviso y éxito', () => {
    for (const [valor, clase] of [['Planificado', 'estado-info'], ['En curso', 'estado-aviso'], ['Finalizado', 'estado-exito']]) {
      const fixture = TestBed.createComponent(EstadoBadge);
      fixture.componentRef.setInput('dominio', 'curso');
      fixture.componentRef.setInput('valor', valor);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('.estado')?.classList).toContain(clase);
    }
  });
});
