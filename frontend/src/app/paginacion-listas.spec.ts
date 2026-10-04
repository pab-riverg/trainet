import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Biblioteca } from './modulos/documentos/biblioteca/biblioteca';
import { Institucionales } from './modulos/documentos/institucionales/institucionales';
import { HistorialDocumentos } from './modulos/documentos/historial/historial';
import { Cursos } from './modulos/capacitacion/cursos/cursos';
import { Capacitaciones } from './modulos/capacitacion/capacitaciones/capacitaciones';
import { Inscripciones } from './modulos/capacitacion/inscripciones/inscripciones';
import { Materiales } from './modulos/capacitacion/materiales/materiales';
import { Evidencias } from './modulos/capacitacion/evidencias/evidencias';
import { Historial } from './modulos/capacitacion/historial/historial';
import { MisTickets } from './modulos/soporte/reportar/reportar';
import { GestionPedidos } from './modulos/recursos/gestion/gestion';
import { MisPedidos } from './modulos/recursos/mis-pedidos/mis-pedidos';
import { CatalogoRecursos } from './modulos/recursos/catalogo/catalogo';
import { CatalogoArticulos } from './modulos/compras-internas/catalogo/articulos/articulos';
import { CatalogoCategorias } from './modulos/compras-internas/catalogo/categorias/categorias';
import { Inventario } from './modulos/inventario/inventario';
import { Directorio } from './modulos/proveedores/directorio/directorio';
import { Acuerdos } from './modulos/proveedores/acuerdos/acuerdos';
import { Necesidades } from './modulos/proveedores/necesidades/necesidades';
import { ArchivosImportados } from './modulos/reportes/archivos/archivos';
import { HistorialInformes } from './modulos/reportes/historial/historial';
import { CategoriasAsistente } from './modulos/asistente/entrenamiento/categorias/categorias';
import { ConsultasAsistente } from './modulos/asistente/entrenamiento/consultas/consultas';
import { SinRespuesta } from './modulos/asistente/sin-respuesta/sin-respuesta';
import { SoporteService } from './servicios/soporte';
import { RecursosService } from './servicios/recursos';
import { ComprasService } from './servicios/compras';
import { CapacitacionService } from './servicios/capacitacion';
import { DocumentosService } from './servicios/documentos';
import { InventarioService } from './servicios/inventario';
import { ProveedoresService } from './servicios/proveedores';
import { ReportesService } from './servicios/reportes';
import { AsistenteService } from './servicios/asistente';

/**
 * Elemento de prueba tolerante: tiene el id indicado y devuelve valores neutros para cualquier otro campo
 * (fechas válidas, números, texto vacío), así la plantilla de cada lista se pinta sin tener que describir su modelo.
 */
function elemento(id: number): Record<string, unknown> {
  return new Proxy({ id, texto: `Texto ${id}`, resuelta: false, util: null, fo_usuario: 7 } as Record<string, unknown>, {
    get: (objetivo, clave) => {
      if (typeof clave === 'symbol' || clave === 'then' || clave === 'toJSON') {
        return undefined;
      }
      if (clave in objetivo) {
        return objetivo[clave];
      }
      if (/fecha/i.test(clave)) {
        return '2026-01-15T10:00:00Z';
      }
      if (/^(precio|total|monto|cantidad|filas|columnas|duracion|tamanio|tamano|presupuesto)/i.test(clave)) {
        return 1;
      }
      return '';
    }
  });
}

const datos = (n: number) => Array.from({ length: n }, (_, i) => elemento(i + 1));

/** Servicio de mentira: el método de la lista devuelve los datos; cualquier otro método devuelve una lista vacía. */
function servicioFalso(metodoLista: string | string[], filas: number): object {
  const metodos = Array.isArray(metodoLista) ? metodoLista : [metodoLista];
  return new Proxy({}, {
    get: (_, nombre) => {
      if (typeof nombre === 'string' && nombre.startsWith('listarModulo')) {
        return () => of([{ id: 1 }]);
      }
      if (nombre === 'listarCarpetas') {
        return () => of({ carpetas: [], total_general: 0 });
      }
      return typeof nombre === 'string' && metodos.includes(nombre) ? () => of(datos(filas)) : () => of([]);
    }
  });
}

interface Caso {
  nombre: string;
  componente: Type<unknown>;
  servicios: [Type<unknown>, string | string[]][];
  entradas?: Record<string, unknown>;
  // Preparación antes del primer render (por ejemplo, el rol guardado).
  antes?: () => void;
  // Acción que carga la lista cuando depende de una selección.
  seleccionar?: (componente: Record<string, any>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  // Cambia un filtro o la selección: la lista debe volver a la página 1.
  reiniciar?: (componente: Record<string, any>) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
}

const FORM = (c: Record<string, any>) => c['filtrosForm'].controls.search.setValue('x'); // eslint-disable-line @typescript-eslint/no-explicit-any

const CASOS: Caso[] = [
  { nombre: 'Soporte: reportar y mis tickets', componente: MisTickets, servicios: [[SoporteService, 'listarTickets']], entradas: { moduloId: 1 } },
  { nombre: 'Recursos: gestión', componente: GestionPedidos, servicios: [[RecursosService, 'listarSolicitudes']], reiniciar: FORM },
  { nombre: 'Recursos: mis pedidos', componente: MisPedidos, servicios: [[RecursosService, 'listarSolicitudes']], entradas: { moduloId: 1 } },
  { nombre: 'Recursos: catálogo', componente: CatalogoRecursos, servicios: [[RecursosService, 'listarTipos']] },
  { nombre: 'Compras: artículos', componente: CatalogoArticulos, servicios: [[ComprasService, 'listarArticulos']], entradas: { moduloId: 1 }, reiniciar: FORM },
  { nombre: 'Compras: categorías', componente: CatalogoCategorias, servicios: [[ComprasService, 'listarCategorias'], [ProveedoresService, 'ninguno']] },
  { nombre: 'Capacitación: cursos', componente: Cursos, servicios: [[CapacitacionService, 'listarCursos']], entradas: { moduloId: 1 } },
  { nombre: 'Capacitación: capacitaciones', componente: Capacitaciones, servicios: [[CapacitacionService, 'listarCapacitaciones']], entradas: { moduloId: 1 } },
  {
    nombre: 'Capacitación: inscripciones', componente: Inscripciones, servicios: [[CapacitacionService, 'listarParticipantes']],
    seleccionar: c => c['capacitacionSeleccionada'].setValue(1), reiniciar: c => c['capacitacionSeleccionada'].setValue(2)
  },
  {
    nombre: 'Capacitación: materiales', componente: Materiales, servicios: [[CapacitacionService, 'listarMateriales']],
    seleccionar: c => c['cursoSeleccionado'].setValue(1), reiniciar: c => c['cursoSeleccionado'].setValue(2)
  },
  {
    nombre: 'Capacitación: evidencias', componente: Evidencias, servicios: [[CapacitacionService, 'listarEvidencias']],
    seleccionar: c => { c['capacitacionSeleccionada'].setValue(1); c['participanteSeleccionado'].setValue(1); },
    reiniciar: c => c['participanteSeleccionado'].setValue(2)
  },
  {
    nombre: 'Capacitación: historial', componente: Historial, servicios: [[CapacitacionService, 'listarParticipantes']],
    seleccionar: c => c['empleadoSeleccionado'].setValue(1), reiniciar: c => c['empleadoSeleccionado'].setValue(2)
  },
  { nombre: 'Documentos: biblioteca', componente: Biblioteca, servicios: [[DocumentosService, 'listarDocumentos']], entradas: { moduloId: 1 }, reiniciar: FORM },
  { nombre: 'Documentos: institucionales', componente: Institucionales, servicios: [[DocumentosService, 'listarInstitucionales']] },
  { nombre: 'Documentos: historial', componente: HistorialDocumentos, servicios: [[DocumentosService, 'listarHistorial']], reiniciar: c => c['filtrosForm'].controls.accion.setValue('consulta') },
  { nombre: 'Inventario: contenidos', componente: Inventario, servicios: [[InventarioService, 'listarContenidos']], reiniciar: FORM },
  { nombre: 'Proveedores: directorio', componente: Directorio, servicios: [[ProveedoresService, 'listarProveedores']], entradas: { moduloId: 1 }, reiniciar: FORM },
  {
    nombre: 'Proveedores: acuerdos', componente: Acuerdos, servicios: [[ProveedoresService, 'listarContratos']],
    reiniciar: c => c['filtroEstado'].setValue('vigente')
  },
  { nombre: 'Proveedores: necesidades', componente: Necesidades, servicios: [[ProveedoresService, 'listarNecesidades']], entradas: { moduloId: 1 } },
  { nombre: 'Reportes: archivos', componente: ArchivosImportados, servicios: [[ReportesService, 'listarArchivos']], reiniciar: FORM },
  { nombre: 'Reportes: historial de informes', componente: HistorialInformes, servicios: [[ReportesService, 'listarInformes']], reiniciar: FORM },
  { nombre: 'Triny: categorías', componente: CategoriasAsistente, servicios: [[AsistenteService, 'listarCategorias']] },
  { nombre: 'Triny: preguntas', componente: ConsultasAsistente, servicios: [[AsistenteService, 'listarConsultas']], reiniciar: FORM },
  { nombre: 'Triny: sin respuesta', componente: SinRespuesta, servicios: [[AsistenteService, 'listarHistorial']] }
];

describe('Paginación de las listas (10 por página)', () => {
  afterEach(() => {
    document.body.replaceChildren();
    localStorage.clear();
  });

  for (const caso of CASOS) {
    it(`${caso.nombre}: 10 filas en la página 1, el resto en la 2 y vuelve a la 1 al cambiar filtro o selección`, () => {
      localStorage.setItem('trainet_rol', 'administrador');
      localStorage.setItem('trainet_id', '7');
      caso.antes?.();
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          ...caso.servicios.map(([token, metodo]) => ({ provide: token, useValue: servicioFalso(metodo, 25) }))
        ]
      });
      const fixture = TestBed.createComponent(caso.componente);
      for (const [nombre, valor] of Object.entries(caso.entradas ?? {})) {
        fixture.componentRef.setInput(nombre, valor);
      }
      const html = fixture.nativeElement as HTMLElement;
      document.body.appendChild(html);
      fixture.detectChanges();
      const componente = fixture.componentInstance as Record<string, unknown>;
      if (caso.seleccionar) {
        caso.seleccionar(componente);
        fixture.detectChanges();
      }

      const filas = (): number => {
        const anterior = html.querySelector('app-paginador')?.previousElementSibling;
        const tabla = anterior?.matches('table') ? anterior : anterior?.querySelector('table');
        return tabla?.querySelectorAll('tbody tr').length ?? -1;
      };
      const irA = (n: number) => {
        (html.querySelector(`button[aria-label="Ir a la página ${n}"]`) as HTMLButtonElement).click();
        fixture.detectChanges();
      };

      expect(html.querySelector('nav[aria-label="Paginación"]'), 'paginador visible').not.toBeNull();
      expect(filas()).toBe(10);
      irA(2);
      expect(html.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('2');
      expect(filas()).toBe(10);
      irA(3);
      expect(filas()).toBe(5);

      if (caso.reiniciar) {
        caso.reiniciar(componente);
        fixture.detectChanges();
        expect(html.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe('1');
      }
    });
  }
});
