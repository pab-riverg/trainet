import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { Inventario } from './modulos/inventario/inventario';
import { Biblioteca } from './modulos/documentos/biblioteca/biblioteca';
import { Institucionales } from './modulos/documentos/institucionales/institucionales';
import { InventarioService } from './servicios/inventario';
import { DocumentosService } from './servicios/documentos';

/** Bootstrap global de mentira: registra qué modales se piden cerrar. */
const ocultar = vi.fn();

interface Pantalla {
  nombre: string;
  componente: Type<unknown>;
  servicio: Type<unknown>;
  metodoSubida: string;
  modalId: string;
  textoBoton: string;
  rolPermitido: string;
  rolSinPermiso: string;
  entradas?: Record<string, unknown>;
  // Rellena el formulario con valores válidos (sin archivo).
  rellenar: (c: Record<string, any>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  // Campo que debe quedar vacío tras cerrar.
  campoVacio: (c: Record<string, any>) => unknown; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const PANTALLAS: Pantalla[] = [
  {
    nombre: 'Inventario: subir contenido', componente: Inventario, servicio: InventarioService, metodoSubida: 'subirContenido',
    modalId: 'modalSubidaContenido', textoBoton: 'Subir contenido', rolPermitido: 'administrador', rolSinPermiso: 'empleado',
    rellenar: c => c['subidaForm'].patchValue({ nombre_contenido: 'Guía', tipo_contenido: 'pdf', fo_categoria_cont: 1, fo_estado_cont: 1 }),
    campoVacio: c => c['subidaForm'].controls.nombre_contenido.value
  },
  {
    nombre: 'Biblioteca: subir documento', componente: Biblioteca, servicio: DocumentosService, metodoSubida: 'subirDocumento',
    modalId: 'modalSubidaDocumento', textoBoton: 'Subir documento', rolPermitido: 'encargado_documental', rolSinPermiso: 'empleado',
    entradas: { moduloId: 1 },
    rellenar: c => c['subidaForm'].patchValue({ titulo: 'Manual', version: '1', fo_tipo_documento: 1, fo_categoria_documento: 1 }),
    campoVacio: c => c['subidaForm'].controls.titulo.value
  },
  {
    nombre: 'Institucionales: subir documento institucional', componente: Institucionales, servicio: DocumentosService,
    metodoSubida: 'subirInstitucional', modalId: 'modalSubidaInstitucional', textoBoton: 'Subir documento institucional',
    rolPermitido: 'administrador', rolSinPermiso: 'empleado',
    rellenar: c => c['subidaForm'].patchValue({ titulo: 'Reglamento' }),
    campoVacio: c => c['subidaForm'].controls.titulo.value
  }
];

describe('Subida en modal (Inventario, Biblioteca, Institucionales)', () => {
  beforeEach(() => {
    ocultar.mockClear();
    (globalThis as Record<string, unknown>)['bootstrap'] = {
      Modal: { getInstance: () => ({ hide: ocultar }), getOrCreateInstance: () => ({ show: vi.fn() }) }
    };
  });
  afterEach(() => {
    document.body.replaceChildren();
    localStorage.clear();
    delete (globalThis as Record<string, unknown>)['bootstrap'];
  });

  for (const p of PANTALLAS) {
    describe(p.nombre, () => {
      let subida: ReturnType<typeof vi.fn>;
      let respuesta: Subject<unknown>;

      function crear(rol: string) {
        localStorage.setItem('trainet_rol', rol);
        respuesta = new Subject<unknown>();
        subida = vi.fn(() => respuesta);
        TestBed.configureTestingModule({
          providers: [
            provideRouter([]),
            {
              provide: p.servicio,
              useValue: new Proxy({}, {
                get: (_, nombre) => {
                  if (nombre === p.metodoSubida) {
                    return subida;
                  }
                  if (typeof nombre === 'string' && nombre.startsWith('listarModulo')) {
                    return () => of([{ id: 1 }]);
                  }
                  return () => of([]);
                }
              })
            }
          ]
        });
        const fixture = TestBed.createComponent(p.componente) as ComponentFixture<unknown>;
        for (const [nombre, valor] of Object.entries(p.entradas ?? {})) {
          fixture.componentRef.setInput(nombre, valor);
        }
        const html = fixture.nativeElement as HTMLElement;
        document.body.appendChild(html);
        fixture.detectChanges();
        const componente = fixture.componentInstance as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
        const modal = () => document.getElementById(p.modalId);
        const archivar = () => componente['onArchivoSeleccionado']({
          target: { files: [new File(['x'], 'a.pdf')], value: '' }
        } as unknown as Event);
        const enviar = () => {
          (modal()?.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
          fixture.detectChanges();
        };
        return { fixture, html, componente, modal, archivar, enviar };
      }

      it('el botón de la cabecera aparece solo para los roles permitidos y apunta al modal', () => {
        const { html, modal } = crear(p.rolPermitido);
        const boton = html.querySelector('.users-table-header button.btn-primary-trainet') as HTMLButtonElement;
        expect(boton.textContent).toContain(p.textoBoton);
        expect(boton.getAttribute('data-bs-toggle')).toBe('modal');
        expect(boton.getAttribute('data-bs-target')).toBe(`#${p.modalId}`);
        expect(modal()?.querySelector('.modal-title')?.textContent?.trim()).toBe(p.textoBoton);
        TestBed.resetTestingModule();
        document.body.replaceChildren();

        const sin = crear(p.rolSinPermiso);
        expect(sin.html.querySelector('.users-table-header button.btn-primary-trainet')).toBeNull();
        expect(sin.modal()).toBeNull();
        // El formulario fijo bajo la tabla ya no existe.
        expect(sin.html.querySelector('form.border-top')).toBeNull();
      });

      it('el modal tiene "* Campo obligatorio", Cancelar y Subir', () => {
        const { modal } = crear(p.rolPermitido);
        expect(modal()?.textContent).toContain('* Campo obligatorio');
        expect(modal()?.querySelector('.modal-footer')?.textContent).toContain('Cancelar');
        expect(modal()?.querySelector('button[type="submit"]')?.textContent).toContain('Subir');
      });

      it('un formulario inválido o sin archivo no llama al servicio', () => {
        const { enviar, componente, archivar } = crear(p.rolPermitido);
        enviar();
        expect(subida).not.toHaveBeenCalled();
        p.rellenar(componente);
        enviar();
        expect(subida).not.toHaveBeenCalled();
        archivar();
        enviar();
        expect(subida).toHaveBeenCalledTimes(1);
      });

      it('durante el envío no hay doble envío y el modal no se puede cerrar', () => {
        const { fixture, enviar, componente, archivar, modal } = crear(p.rolPermitido);
        p.rellenar(componente);
        archivar();
        enviar();
        enviar();
        expect(subida).toHaveBeenCalledTimes(1);
        const boton = modal()?.querySelector('button[type="submit"]') as HTMLButtonElement;
        expect(boton.disabled).toBe(true);
        expect(boton.textContent).toContain('Subiendo…');
        fixture.detectChanges();

        const evento = new Event('hide.bs.modal', { cancelable: true });
        modal()?.dispatchEvent(evento);
        expect(evento.defaultPrevented).toBe(true);
      });

      it('éxito: cierra el modal y reinicia el formulario', () => {
        const { enviar, componente, archivar } = crear(p.rolPermitido);
        p.rellenar(componente);
        archivar();
        enviar();
        respuesta.next({});
        expect(ocultar).toHaveBeenCalledTimes(1);
        expect(p.campoVacio(componente)).toBe('');
        expect(componente['archivoSeleccionado']()).toBeNull();
      });

      it('error: el modal sigue abierto con el mensaje visible', () => {
        const { fixture, enviar, componente, archivar, modal } = crear(p.rolPermitido);
        p.rellenar(componente);
        archivar();
        enviar();
        respuesta.error(new Error('fallo'));
        fixture.detectChanges();
        expect(ocultar).not.toHaveBeenCalled();
        expect(modal()?.querySelector('.text-danger')?.textContent).toContain('No se pudo subir');
        expect(componente['subiendo']()).toBe(false);
      });

      it('al cerrar el modal el formulario y el archivo se reinician', () => {
        const { fixture, componente, archivar, modal } = crear(p.rolPermitido);
        p.rellenar(componente);
        archivar();
        expect(p.campoVacio(componente)).not.toBe('');
        modal()?.dispatchEvent(new Event('hidden.bs.modal'));
        fixture.detectChanges();
        expect(p.campoVacio(componente)).toBe('');
        expect(componente['archivoSeleccionado']()).toBeNull();
        expect(componente['errorSubida']()).toBeNull();
      });
    });
  }
});
