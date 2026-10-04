import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ComprasService } from './servicios/compras';
import { DocumentosService } from './servicios/documentos';
import { InventarioService } from './servicios/inventario';
import { ProveedoresService } from './servicios/proveedores';
import { UsuariosService } from './servicios/usuarios';
import { CatalogoArticulos } from './modulos/compras-internas/catalogo/articulos/articulos';
import { CatalogoCategorias } from './modulos/compras-internas/catalogo/categorias/categorias';
import { DetalleSolicitud } from './modulos/compras-internas/detalle-solicitud/detalle-solicitud';
import { SeccionCotizaciones } from './modulos/compras-internas/detalle-solicitud/seccion-cotizaciones/seccion-cotizaciones';
import { ListaSolicitudes } from './modulos/compras-internas/solicitudes/solicitudes';
import { Biblioteca } from './modulos/documentos/biblioteca/biblioteca';
import { HistorialDocumentos } from './modulos/documentos/historial/historial';
import { Institucionales } from './modulos/documentos/institucionales/institucionales';
import { Inventario } from './modulos/inventario/inventario';
import { Usuarios } from './modulos/usuarios/usuarios';
import { CapacitacionService } from './servicios/capacitacion';
import { SoporteService } from './servicios/soporte';
import { Capacitaciones } from './modulos/capacitacion/capacitaciones/capacitaciones';
import { Cursos } from './modulos/capacitacion/cursos/cursos';
import { Evidencias } from './modulos/capacitacion/evidencias/evidencias';
import { Historial as HistorialCapacitacion } from './modulos/capacitacion/historial/historial';
import { Inscripciones } from './modulos/capacitacion/inscripciones/inscripciones';
import { Materiales } from './modulos/capacitacion/materiales/materiales';
import { GestionTickets } from './modulos/soporte/gestion/gestion';
import { MisTickets } from './modulos/soporte/reportar/reportar';
import { RecursosService } from './servicios/recursos';
import { CatalogoRecursos } from './modulos/recursos/catalogo/catalogo';
import { GestionPedidos } from './modulos/recursos/gestion/gestion';
import { MisPedidos } from './modulos/recursos/mis-pedidos/mis-pedidos';
import { Acuerdos } from './modulos/proveedores/acuerdos/acuerdos';
import { DetalleProveedor } from './modulos/proveedores/detalle-proveedor/detalle-proveedor';
import { Directorio } from './modulos/proveedores/directorio/directorio';
import { Necesidades } from './modulos/proveedores/necesidades/necesidades';
import { AdministracionService } from './servicios/administracion';
import { AsistenteService } from './servicios/asistente';
import { ReportesService } from './servicios/reportes';
import { Bitacora } from './modulos/administrador/bitacora/bitacora';
import { CategoriasAsistente } from './modulos/asistente/entrenamiento/categorias/categorias';
import { ConsultasAsistente } from './modulos/asistente/entrenamiento/consultas/consultas';
import { HistorialAsistente } from './modulos/asistente/historial/historial';
import { SinRespuesta } from './modulos/asistente/sin-respuesta/sin-respuesta';
import { ArchivosImportados } from './modulos/reportes/archivos/archivos';
import { HistorialInformes } from './modulos/reportes/historial/historial';
import { ContenidoInforme } from './compartidos/contenido-informe/contenido-informe';

// Patrón .tabla-tarjetas: cada dato lleva data-label con el texto de su <th>; la primera celda es .celda-principal y la
// de acciones .celda-acciones (ambas sin etiqueta; la miniatura de artículos tampoco); la fila de estado vacío no lleva
// etiqueta; los roles ARIA de tabla se repiten porque en móvil cambia el display.

const documento = { id: 1, titulo: 'Manual', fecha_creacion: '2026-01-01', version: '1.0', archivo: '/media/m.pdf', tamanio: 2048, fo_tipo_documento: 1, fo_categoria_documento: 1, fo_mod_doc: 1, tipo_nombre: 'Guía', categoria_nombre: 'RRHH' };
const registro = { id: 1, accion: 'consulta', fecha: '2026-01-02', fo_documento: 1, fo_usuario: 1, documento_titulo: 'Manual', usuario_nombre: 'Ana' };
const institucional = { id: 1, titulo: 'Reglamento', descripcion: 'Interno', archivo: '/media/r.pdf', fecha_subida: '2026-01-03', fo_usuario: 1, usuario_nombre: 'Ana' };
const contenido = { id: 1, nombre_contenido: 'Video', tipo_contenido: 'video', archivo: '/media/v.mp4', fecha_creacion: '2026-01-01', fecha_actualizacion: '2026-01-01', fo_categoria_cont: 1, fo_estado_cont: 1, fo_mod_inv: 1, categoria_nombre: 'Cursos', estado_nombre: 'Activo' };
const usuario = { id: 1, nombre: 'Ana', email: 'ana@trainet.test', fecha_registro: '2026-01-01', telefono: '', cedula: null, is_active: true, rol: 'empleado' };

const solicitud = {
  id: 7, fecha_solicitud: '2026-02-01', area: 'Sistemas', nota: '', estado: 'pendiente', total_estimado: 1000, motivo_decision: '',
  fecha_decision: null, fo_solicitante: 1, solicitante_nombre: 'Ana', fo_aprobador: null, fo_mod_compras: 1,
  items: [{ id: 1, articulo_nombre: 'Mouse', categoria_nombre: 'Periféricos', cantidad: 2, precio_unitario: 500, subtotal: 1000 }],
  fecha_compra: null, fo_comprador: null, fo_orden: null, fo_cotizacion_elegida: null, fecha_entrega: null, fo_entregado_por: null,
  fecha_confirmacion: null, motivo_reclamo: '', fecha_reclamo: null
};
const articulo = { id: 1, nombre: 'Mouse', descripcion: '', precio_referencia: 500, disponible: true, imagen: null, fo_categoria: 1, categoria_nombre: 'Periféricos', categoria_icono: 'bi-mouse' };
const categoriaCompra = { id: 1, nombre: 'Periféricos', icono: 'bi-mouse', proveedores: [], proveedores_nombres: ['Acme'] };
const cotizacion = { id: 1, archivo: '/media/c.pdf', fecha_carga: '2026-02-02T10:00:00Z', monto_total: 900, iva: 100, fo_solicitud: 7, fo_proveedor: 1, proveedor_nombre: 'Acme', es_elegida: false, usuario_nombre: 'Ana' };

const ticket = { id: 3, fecha_creacion: '2026-01-01', prioridad: 'media', descripcion: 'Falla', estado: 'abierto', observaciones: '', tiempo_resolucion: 0, fecha_resolucion: null, fo_categoria_ticket: 1, fo_tecnico: null, fo_usuario: 1, fo_mod_soporte: 1, categoria_nombre: 'Hardware', usuario_nombre: 'Ana', tecnico_nombre: null };
const capacitacion = { id: 1, fecha_inicio: '2026-03-01', fecha_fin: '2026-03-02', modalidad: 'virtual', fo_instructor: 1, fo_mod_cap: 1, fo_curso: 1, curso_titulo: 'Seguridad', instructor_nombre: 'Luis' };
const curso = { id: 1, titulo: 'Seguridad', descripcion: '', duracion: 8, fecha_creacion: '2026-01-01', estado: 'planificado', video_url: null, fo_categoria_curso: 1, fo_mod_cap: 1, categoria_nombre: 'TI' };
const participante = { id: 1, asistio: true, fo_capacitacion: 1, fo_empleado: 1, empleado_nombre: 'Ana', curso_titulo: 'Seguridad', fecha_inicio: '2026-03-01' };
const evidencia = { id: 1, archivo: '/media/e.pdf', fecha_subida: '2026-03-02', fo_participante: 1 };
const material = { id: 1, titulo: 'Guía', archivo: '/media/g.pdf', fecha_subida: '2026-03-02', fo_curso: 1 };

// Servicio de capacitación: las listas con datos o vacías; los selectores de las pantallas se eligen vía `seleccionar`.
function capacitacionSrv(vacio: boolean): Record<string, unknown> {
  return {
    listarCapacitaciones: lista(vacio, [capacitacion]), listarCursos: lista(vacio, [curso]), listarCapacitadores: () => of([]),
    listarCategorias: () => of([]), listarEmpleados: () => of([{ id: 1, fo_usuario: 1, fo_usuario_nombre: 'Ana' }]),
    listarParticipantes: lista(vacio, [participante]), listarEvidencias: lista(vacio, [evidencia]),
    listarMateriales: lista(vacio, [material]), listarProgreso: () => of([])
  };
}

const tipoRecurso = { id: 1, nombre_tipo: 'Laptop', disponible: true };
const pedido = { id: 5, fecha_solicitud: '2026-04-01', cantidad: 2, justificacion: 'x', prioridad: 'alta', estado: 'pendiente', presupuesto_estimado: 0, comentario_encargado: '', archivo_entrega: null, fo_tipo_recurso: 1, fo_usuario: 1, fo_mod_pedido: 1, tipo_nombre: 'Laptop', usuario_nombre: 'Ana' };
const proveedor = { id: 1, razon_social: 'Acme SAS', contacto: 'Luis', email: 'luis@acme.test', telefono: '+57 3001234567', calificacion: 5, rut: '9001234567', especialidad: 'TI', estado: 'activo', fo_mod_prov: 1 };
const contrato = { id: 4, descripcion: 'Soporte anual', fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31', estado: 'vigente', confirmacion: '', motivo_decision: '', fecha_decision: null, archivo: null, fo_proveedor: 1, fo_cotizacion: null, fo_usuario: 1, fo_aprobador: null, proveedor_nombre: 'Acme SAS' };
const cotizacionProv = { id: 2, archivo: '/media/q.pdf', fecha_carga: '2026-02-02', estado: 'pendiente', fo_proveedor: 1, fo_usuario: 1 };
const necesidad = { id: 1, tema: 'Excel', area: 'Finanzas', fecha: '2026-05-01', observaciones: '', fo_usuario: 1, fo_mod_prov: 1, usuario_nombre: 'Ana' };

function recursosSrv(vacio: boolean): Record<string, unknown> {
  return { listarTipos: lista(vacio, [tipoRecurso]), listarSolicitudes: lista(vacio, [pedido]), listarModuloPedidos: () => of([]) };
}

function proveedoresSrv(vacio: boolean): Record<string, unknown> {
  return {
    listarProveedores: lista(vacio, [proveedor]), listarContratos: lista(vacio, [contrato]), listarNecesidades: lista(vacio, [necesidad]),
    listarCotizaciones: lista(vacio, [cotizacionProv]), historialProveedor: lista(vacio, [contrato]), obtenerProveedor: () => of(proveedor)
  };
}

const archivoImportado = { id: 1, titulo: 'Ventas', descripcion: '', archivo: '/media/v.csv', archivo_nombre: 'v.csv', formato: 'csv', fo_tipo: 1, tipo_nombre: 'Ventas', fecha_documento: '2026-03-01', fecha_importacion: '2026-03-02', filas: 10, columnas: 4, encabezados: [], activo: true, fo_usuario: 1, usuario_nombre: 'Ana' };
const informe = { id: 1, titulo: 'Informe de soporte', fo_tipo_reporte: 1, tipo_nombre: 'Soporte', tipo_clave: 'soporte', fecha_generacion: '2026-03-02', fo_usuario: 1, usuario_nombre: 'Ana', parametros: {}, total_archivos: 0 };
const evento = { id: 1, fecha_evento: '2026-03-02', fecha_hora: '2026-03-02T10:00:00Z', accion: 'login', accion_etiqueta: 'Inicio de sesión', modulo: 'usuarios', modulo_etiqueta: 'Usuarios', descripcion: 'Ana inició sesión', fo_usuario: 1, usuario_nombre: 'Ana', ip: '127.0.0.1' };
const categoriaAsistente = { id: 1, nombre: 'Soporte', icono: 'bi-tools', orden: 1, fo_mod_asistente: 1, total_consultas: 3 };
const consultaFrecuente = { id: 1, pregunta: '¿Cómo pido una laptop?', respuesta: 'x', fo_categoria: 1, categoria_nombre: 'Soporte', categoria_icono: 'bi-tools', palabras_clave: '', archivo: null, archivo_nombre: null, activa: true, fo_mod_asistente: 1 };
const filaHistorial = { id: 1, fo_usuario: 1, usuario_nombre: 'Ana', texto: 'no funciona el wifi', origen: 'texto', consulta: null, consulta_pregunta: null, resuelta: false, util: null, fecha: '2026-03-02T10:00:00Z' };
const contenidoInforme = (vacio: boolean) => ({
  titulo: 'Informe', subtitulo: '', generado_en: '2026-03-02T10:00:00Z', indicadores: [], graficos: [],
  secciones: [
    { titulo: 'Por estado', columnas: ['Estado', 'Total', '%'], filas: vacio ? [] : [['Abierto', 3, 30]], nota: null },
    { titulo: 'Detalle', columnas: ['A', 'B', 'C', 'D', 'E'], filas: vacio ? [] : [[1, 2, 3, 4, 5]], nota: null }
  ]
});

interface Caso {
  nombre: string;
  // Rol de la sesión (por defecto administrador); 'empleado' prueba las tablas sin la columna Acciones.
  rol?: string;
  componente: Type<unknown>;
  // Controles de selección del componente que se fijan a 1 (en orden) para que aparezca la tabla.
  seleccionar?: string[];
  // Servicios simulados (con datos o vacíos) y entradas (inputs) del componente.
  armar: (vacio: boolean) => { servicios: [unknown, Record<string, unknown>][]; entradas?: Record<string, unknown> };
}

const lista = (vacio: boolean, datos: unknown[]) => () => of(vacio ? [] : datos);

function documentos(vacio: boolean, docs: unknown[], historial: unknown[], institucionales: unknown[]): Record<string, unknown> {
  return {
    listarDocumentos: lista(vacio, docs), listarTipos: () => of([]), listarCategorias: () => of([]),
    listarHistorial: lista(vacio, historial), listarInstitucionales: lista(vacio, institucionales)
  };
}

function compras(vacio: boolean): Record<string, unknown> {
  return {
    listarSolicitudes: lista(vacio, [solicitud]), listarModuloCompras: () => of([]),
    obtenerSolicitud: () => of({ ...solicitud, items: vacio ? [] : solicitud.items }),
    listarArticulos: lista(vacio, [articulo]), listarCategorias: lista(vacio, [categoriaCompra]), listarCotizaciones: () => of([]),
    listarProveedoresSugeridos: () => of([])
  };
}

const proveedores = { listarProveedores: () => of([]) };

const casos: Caso[] = [
  { nombre: 'Biblioteca', componente: Biblioteca, armar: v => ({ servicios: [[DocumentosService, documentos(v, [documento], [], [])]] }) },
  { nombre: 'Historial de documentos', componente: HistorialDocumentos, armar: v => ({ servicios: [[DocumentosService, documentos(v, [], [registro], [])]] }) },
  { nombre: 'Institucionales', componente: Institucionales, armar: v => ({ servicios: [[DocumentosService, documentos(v, [], [], [institucional])]] }) },
  {
    nombre: 'Inventario', componente: Inventario,
    armar: v => ({ servicios: [[InventarioService, { listarModuloInventario: () => of([{ id: 1 }]), listarContenidos: lista(v, [contenido]), listarCategorias: () => of([]), listarEstados: () => of([]) }]] })
  },
  { nombre: 'Usuarios', componente: Usuarios, armar: v => ({ servicios: [[UsuariosService, { listar: lista(v, [usuario]), listarSupervisores: () => of([]) }]] }) },
  { nombre: 'Compras: artículos del catálogo', componente: CatalogoArticulos, armar: v => ({ servicios: [[ComprasService, compras(v)]], entradas: { moduloId: 1 } }) },
  { nombre: 'Compras: categorías del catálogo', componente: CatalogoCategorias, armar: v => ({ servicios: [[ComprasService, compras(v)], [ProveedoresService, proveedores]] }) },
  { nombre: 'Compras: solicitudes (todas)', componente: ListaSolicitudes, armar: v => ({ servicios: [[ComprasService, compras(v)]], entradas: { modo: 'todas' } }) },
  {
    nombre: 'Compras: detalle de solicitud', componente: DetalleSolicitud,
    armar: v => ({ servicios: [[ComprasService, compras(v)]], entradas: { solicitud: { ...solicitud, items: v ? [] : solicitud.items } } })
  },
  {
    nombre: 'Compras: cotizaciones', componente: SeccionCotizaciones,
    armar: v => ({ servicios: [[ComprasService, compras(v)], [ProveedoresService, proveedores]], entradas: { solicitud, cotizaciones: v ? [] : [cotizacion] } })
  }
  ,
  { nombre: 'Capacitación: capacitaciones', componente: Capacitaciones, armar: v => ({ servicios: [[CapacitacionService, capacitacionSrv(v)]], entradas: { moduloId: 1 } }) },
  { nombre: 'Capacitación: cursos', componente: Cursos, armar: v => ({ servicios: [[CapacitacionService, capacitacionSrv(v)]], entradas: { moduloId: 1 } }) },
  { nombre: 'Capacitación: inscripciones', componente: Inscripciones, seleccionar: ['capacitacionSeleccionada'], armar: v => ({ servicios: [[CapacitacionService, capacitacionSrv(v)]] }) },
  { nombre: 'Capacitación: materiales', componente: Materiales, seleccionar: ['cursoSeleccionado'], armar: v => ({ servicios: [[CapacitacionService, capacitacionSrv(v)]] }) },
  { nombre: 'Capacitación: evidencias', componente: Evidencias, seleccionar: ['capacitacionSeleccionada', 'participanteSeleccionado'], armar: v => ({ servicios: [[CapacitacionService, { ...capacitacionSrv(v), listarParticipantes: () => of([participante]) }]] }) },
  { nombre: 'Capacitación: historial por empleado', componente: HistorialCapacitacion, seleccionar: ['empleadoSeleccionado'], armar: v => ({ servicios: [[CapacitacionService, capacitacionSrv(v)]] }) },
  { nombre: 'Soporte: gestión de tickets', componente: GestionTickets, armar: v => ({ servicios: [[SoporteService, { listarTickets: lista(v, [ticket]), listarCategorias: () => of([]), listarTecnicos: () => of([]) }]] }) },
  { nombre: 'Recursos: catálogo', componente: CatalogoRecursos, armar: v => ({ servicios: [[RecursosService, recursosSrv(v)]] }) },
  { nombre: 'Recursos: gestión de pedidos', componente: GestionPedidos, armar: v => ({ servicios: [[RecursosService, recursosSrv(v)]] }) },
  { nombre: 'Recursos: mis pedidos', componente: MisPedidos, armar: v => ({ servicios: [[RecursosService, recursosSrv(v)]], entradas: { moduloId: 1 } }) },
  { nombre: 'Proveedores: directorio', componente: Directorio, armar: v => ({ servicios: [[ProveedoresService, proveedoresSrv(v)]], entradas: { moduloId: 1 } }) },
  { nombre: 'Proveedores: directorio (solo lectura)', rol: 'empleado', componente: Directorio, armar: v => ({ servicios: [[ProveedoresService, proveedoresSrv(v)]], entradas: { moduloId: 1 } }) },
  { nombre: 'Proveedores: acuerdos', componente: Acuerdos, armar: v => ({ servicios: [[ProveedoresService, proveedoresSrv(v)]] }) },
  { nombre: 'Proveedores: necesidades', componente: Necesidades, armar: v => ({ servicios: [[ProveedoresService, proveedoresSrv(v)]], entradas: { moduloId: 1 } }) },
  { nombre: 'Proveedores: detalle (cotizaciones y acuerdos)', componente: DetalleProveedor, armar: v => ({ servicios: [[ProveedoresService, proveedoresSrv(v)]], entradas: { proveedor } }) },
  { nombre: 'Proveedores: detalle (solo lectura)', rol: 'empleado', componente: DetalleProveedor, armar: v => ({ servicios: [[ProveedoresService, proveedoresSrv(v)]], entradas: { proveedor } }) },
  { nombre: 'Capacitación: cursos (solo lectura)', rol: 'empleado', componente: Cursos, armar: v => ({ servicios: [[CapacitacionService, capacitacionSrv(v)]], entradas: { moduloId: 1 } }) },
  { nombre: 'Reportes: archivos importados', componente: ArchivosImportados, armar: v => ({ servicios: [[ReportesService, { listarArchivos: lista(v, [archivoImportado]), listarTipos: () => of([]), listarCarpetas: () => of({ carpetas: [], total_general: 0 }) }]], entradas: { puedeImportar: true } }) },
  { nombre: 'Reportes: archivos importados (solo lectura)', componente: ArchivosImportados, armar: v => ({ servicios: [[ReportesService, { listarArchivos: lista(v, [archivoImportado]), listarTipos: () => of([]), listarCarpetas: () => of({ carpetas: [], total_general: 0 }) }]] }) },
  { nombre: 'Reportes: historial de informes', componente: HistorialInformes, armar: v => ({ servicios: [[ReportesService, { listarInformes: lista(v, [informe]), listarTipos: () => of([]) }]], entradas: { puedeEliminar: true } }) },
  { nombre: 'Reportes: contenido del informe (hasta 3 columnas)', componente: ContenidoInforme, armar: v => ({ servicios: [], entradas: { contenido: contenidoInforme(v) } }) },
  { nombre: 'Administración: bitácora', componente: Bitacora, armar: v => ({ servicios: [[AdministracionService, { listarAuditoria: () => of({ count: v ? 0 : 1, results: v ? [] : [evento] }), listarCatalogoAuditoria: () => of({ acciones: [], modulos: [] }) }]] }) },
  { nombre: 'Triny: categorías', componente: CategoriasAsistente, armar: v => ({ servicios: [[AsistenteService, { listarCategorias: lista(v, [categoriaAsistente]) }]] }) },
  { nombre: 'Triny: preguntas', componente: ConsultasAsistente, armar: v => ({ servicios: [[AsistenteService, { listarCategorias: lista(v, [categoriaAsistente]), listarConsultas: lista(v, [consultaFrecuente]) }]] }) },
  { nombre: 'Triny: mi historial', componente: HistorialAsistente, armar: v => ({ servicios: [[AsistenteService, { listarHistorial: lista(v, [filaHistorial]) }]] }) },
  { nombre: 'Triny: historial global', componente: HistorialAsistente, armar: v => ({ servicios: [[AsistenteService, { listarHistorial: lista(v, [filaHistorial]) }]], entradas: { modo: 'global' } }) },
  { nombre: 'Triny: sin respuesta', componente: SinRespuesta, armar: v => ({ servicios: [[AsistenteService, { listarHistorial: lista(v, [filaHistorial]) }]] }) },
  { nombre: 'Soporte: mis tickets', componente: MisTickets, armar: v => ({ servicios: [[SoporteService, { listarTickets: lista(v, [ticket]), listarCategorias: () => of([]), listarTecnicos: () => of([]) }]] }) }
];

describe('Tablas en tarjetas (data-label y clases del patrón)', () => {
  beforeEach(() => {
    localStorage.setItem('trainet_rol', 'administrador');
    localStorage.setItem('trainet_id', '1');
  });
  afterEach(() => {
    localStorage.removeItem('trainet_rol');
    localStorage.removeItem('trainet_id');
    document.body.replaceChildren();
  });

  function render(caso: Caso, vacio: boolean): HTMLElement {
    localStorage.setItem('trainet_rol', caso.rol ?? 'administrador');
    const { servicios, entradas } = caso.armar(vacio);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), ...servicios.map(([token, valor]) => ({ provide: token, useValue: valor }))]
    });
    const fixture = TestBed.createComponent(caso.componente);
    for (const [clave, valor] of Object.entries(entradas ?? {})) {
      fixture.componentRef.setInput(clave, valor);
    }
    fixture.detectChanges();
    for (const nombre of caso.seleccionar ?? []) {
      (fixture.componentInstance as unknown as Record<string, FormControl>)[nombre].setValue(1);
      fixture.detectChanges();
    }
    const html = fixture.nativeElement as HTMLElement;
    document.body.appendChild(html);
    return html;
  }

  const esEspecial = (celda: Element) =>
    celda.classList.contains('celda-principal') || celda.classList.contains('celda-acciones') || celda.classList.contains('celda-miniatura') || celda.classList.contains('celda-seleccion');

  for (const caso of casos) {
    describe(caso.nombre, () => {
      it('las celdas de datos llevan data-label con el texto de su encabezado; principal y acciones, sin etiqueta', () => {
        const html = render(caso, false);
        const tablas = Array.from(html.querySelectorAll('table.users-table.tabla-tarjetas'));
        expect(tablas.length).toBeGreaterThan(0);
        for (const tabla of tablas) {
          expect(tabla.getAttribute('role')).toBe('table');

          const encabezados = Array.from(tabla.querySelectorAll('thead th')).map(th => th.textContent?.trim());
          const celdas = Array.from(tabla.querySelectorAll('tbody tr')[0].querySelectorAll('td'));
          expect(celdas.length).toBe(encabezados.length);

          expect(celdas.filter(c => c.classList.contains('celda-principal')).length).toBe(1);
          celdas.forEach((celda, i) => {
            expect(celda.getAttribute('role')).toBe('cell');
            if (esEspecial(celda)) {
              expect(celda.hasAttribute('data-label')).toBe(false);
            } else {
              expect(celda.getAttribute('data-label')).toBe(encabezados[i]);
            }
          });

          if (encabezados[encabezados.length - 1] === 'Acciones') {
            expect(celdas[celdas.length - 1].classList.contains('celda-acciones')).toBe(true);
          }
        }
      });

      it('la fila de estado vacío ocupa toda la fila y no lleva etiqueta', () => {
        const html = render(caso, true);
        const tablas = Array.from(html.querySelectorAll('table.tabla-tarjetas'));
        expect(tablas.length).toBeGreaterThan(0);
        for (const tabla of tablas) {
          const fila = tabla.querySelector('tbody tr')!;
          const celda = fila.querySelector('td')!;
          expect(fila.querySelectorAll('td').length).toBe(1);
          expect(celda.hasAttribute('colspan')).toBe(true);
          expect(celda.hasAttribute('data-label')).toBe(false);
          expect(esEspecial(celda)).toBe(false);
        }
      });

      it('la tabla mantiene la semántica: rowgroup, row y columnheader', () => {
        const html = render(caso, false);
        for (const tabla of Array.from(html.querySelectorAll('table.tabla-tarjetas'))) {
          expect(tabla.querySelector('thead')?.getAttribute('role')).toBe('rowgroup');
          expect(tabla.querySelector('tbody')?.getAttribute('role')).toBe('rowgroup');
          expect(tabla.querySelector('tbody tr')?.getAttribute('role')).toBe('row');
          expect(tabla.querySelector('th')?.getAttribute('role')).toBe('columnheader');
        }
      });
    });
  }
});

describe('Contenido de informe: tarjeta o scroll interno según el número de columnas', () => {
  afterEach(() => document.body.replaceChildren());

  it('hasta 3 columnas usan tarjetas; con más se quedan como tabla dentro de su contenedor con scroll', () => {
    const fixture = TestBed.createComponent(ContenidoInforme);
    fixture.componentRef.setInput('contenido', contenidoInforme(false));
    fixture.detectChanges();
    const html = fixture.nativeElement as HTMLElement;
    const tablas = Array.from(html.querySelectorAll('table.users-table'));
    expect(tablas.map(t => t.classList.contains('tabla-tarjetas'))).toEqual([true, false]);
    expect(tablas[1].closest('.table-responsive')).not.toBeNull();
    expect(tablas[1].querySelector('td')?.hasAttribute('data-label')).toBe(false);
    expect(tablas[1].querySelector('td')?.classList.contains('celda-principal')).toBe(false);
  });
});
