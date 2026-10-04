"""Pruebas del buscador global: alcance por rol, campos sensibles, rutas, topes y límites."""
import re
from unittest import mock
from urllib.parse import parse_qs, urlsplit

from django.core.cache import cache
from django.core.files.base import ContentFile
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from administracion.models import ModuloAdministracion, SistemaTrainet
from capacitacion.models import CategoriaCurso, Capacitacion, Curso, MaterialEducativo, ModuloCapacitacion
from compras.models import Articulo, CategoriaArticulo, ModuloComprasInternas, SolicitudCompra
from documentos.models import CategoriaDocumento, Documento, ModuloGestionDocumental, TipoDocumento
from inicio.modulos import modulos_visibles
from inventario.models import CategoriaContenido, Contenido, EstadoContenido, ModuloInventarioContenido
from proveedores.models import ModuloGestionProveedores, Proveedor
from recursos.models import ModuloPedidoRecursos, SolicitudRecursos, TipoRecurso
from reportes.models import ArchivoImportado, ModuloReportes, Reporte, TipoReporte
from soporte.models import CategoriaTicket, ModuloSoporteTecnico, TicketSoporte
from usuarios.models import Capacitador, Empleado, Supervisor, TecnicoSoporte, Usuario

from .buscadores.paginas import normalizar
from .registro import BUSCADORES
from .rutas import ruta_resultado

TODOS_LOS_ROLES = [codigo for codigo, _ in Usuario.ROL_CHOICES]
CLAVE = 'zafiro'
CEDULA, TELEFONO, RUT, CONTACTO = '1234567890', '0999888777', '99887766-5', 'Contacto Reservado'
RUTA_VALIDA = re.compile(r'^/[a-z0-9_-]+(\?(vista=[a-z0-9_-]+&)?q=[A-Za-z0-9_.~%-]+|\?vista=[a-z0-9_-]+)?$')


def crear_usuario(rol, correo=None, **extra):
    return Usuario.objects.create_user(email=correo or f'{rol}@prueba.test', nombre=f'Persona {rol}', password='x',
                                       rol=rol, **extra)


class BaseBusquedaTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        sistema = SistemaTrainet.objects.create(version='1.0', fecha_instalacion=timezone.localdate())
        ModuloAdministracion.objects.create(fo_sistema=sistema)
        hoy = timezone.localdate()

        cls.usuarios = {rol: crear_usuario(rol) for rol in TODOS_LOS_ROLES}
        cls.empleado, cls.otro = cls.usuarios['empleado'], crear_usuario('empleado', 'otro@prueba.test')
        # Datos sensibles de prueba: no deben poder encontrarse ni devolverse.
        cls.sensible = crear_usuario('empleado', 'sensible@prueba.test', cedula=CEDULA, telefono=TELEFONO)
        supervisor = Supervisor.objects.create(fo_usuario=cls.usuarios['supervisor'])
        Empleado.objects.create(fo_usuario=cls.empleado, puesto=f'Analista {CLAVE}', fecha_ingreso=hoy, fo_supervisor=supervisor)

        # Proveedores
        mod_prov = ModuloGestionProveedores.objects.create(fo_sistema=sistema)
        Proveedor.objects.create(razon_social=f'Proveedor {CLAVE}', contacto=CONTACTO, email='contacto@prov.test',
                                 telefono='5551234', rut=RUT, especialidad='Liderazgo', fo_mod_prov=mod_prov)

        # Capacitación
        mod_cap = ModuloCapacitacion.objects.create(fo_sistema=sistema)
        categoria = CategoriaCurso.objects.create(nombre_categoria='Seguridad')
        curso = Curso.objects.create(titulo=f'Curso {CLAVE}', descripcion='d', estado='activo', fo_mod_cap=mod_cap,
                                     fo_categoria_curso=categoria)
        instructor = Capacitador.objects.create(fo_usuario=cls.usuarios['capacitador'], especialidad_tecnica='x')
        Capacitacion.objects.create(fecha_inicio=hoy, fecha_fin=hoy, modalidad='Virtual', fo_instructor=instructor,
                                    fo_mod_cap=mod_cap, fo_curso=curso)
        MaterialEducativo.objects.create(titulo=f'Material {CLAVE}', fo_curso=curso, archivo=ContentFile(b'm', name='m.pdf'))

        # Documentos e inventario
        mod_doc = ModuloGestionDocumental.objects.create(fo_sistema=sistema)
        cls.mod_doc = mod_doc
        cls.tipo_doc = TipoDocumento.objects.create(nombre_tipo='PDF')
        cls.cat_doc = CategoriaDocumento.objects.create(nombre_categoria='Manuales', fo_mod_doc=mod_doc)
        cls.crear_documento(f'Documento {CLAVE}')
        mod_inv = ModuloInventarioContenido.objects.create(fo_sistema=sistema)
        Contenido.objects.create(nombre_contenido=f'Contenido {CLAVE}', tipo_contenido='pdf',
                                 archivo=ContentFile(b'x', name='c.pdf'), fo_mod_inv=mod_inv,
                                 fo_categoria_cont=CategoriaContenido.objects.create(nombre_categoria='Guías'),
                                 fo_estado_cont=EstadoContenido.objects.create(nombre_estado='Vigente'))

        # Soporte: un ticket propio, uno ajeno, uno del técnico y uno de otro técnico.
        mod_sop = ModuloSoporteTecnico.objects.create(fo_sistema=sistema)
        cat = CategoriaTicket.objects.create(nombre_categoria='Hardware')
        cls.tecnico = TecnicoSoporte.objects.create(fo_usuario=cls.usuarios['tecnico_soporte'], especialidad_tecnica='x')
        otro_tecnico = TecnicoSoporte.objects.create(fo_usuario=crear_usuario('tecnico_soporte', 't2@prueba.test'),
                                                     especialidad_tecnica='y')
        for texto, dueno, tecnico in (('propio', cls.empleado, None), ('ajeno', cls.otro, otro_tecnico),
                                      ('del tecnico', cls.otro, cls.tecnico)):
            TicketSoporte.objects.create(descripcion=f'Ticket {CLAVE} {texto}', fo_categoria_ticket=cat, fo_usuario=dueno,
                                         fo_tecnico=tecnico, fo_mod_soporte=mod_sop)

        # Recursos
        mod_rec = ModuloPedidoRecursos.objects.create(fo_sistema=sistema)
        tipo = TipoRecurso.objects.create(nombre_tipo=f'Recurso {CLAVE}')
        for texto, dueno in (('propio', cls.empleado), ('ajeno', cls.otro)):
            SolicitudRecursos.objects.create(cantidad=1, justificacion=f'Pedido {texto}', prioridad='baja',
                                             estado='pendiente', fo_tipo_recurso=tipo, fo_usuario=dueno, fo_mod_pedido=mod_rec)

        # Compras
        mod_com = ModuloComprasInternas.objects.create(fo_sistema=sistema)
        cat_art = CategoriaArticulo.objects.create(nombre='Oficina')
        for nombre, disponible in ((f'Articulo {CLAVE}', True), (f'Articulo {CLAVE} oculto', False)):
            Articulo.objects.create(nombre=nombre, disponible=disponible, fo_categoria=cat_art, fo_mod_compras=mod_com)
        for texto, dueno in (('propia', cls.empleado), ('ajena', cls.otro)):
            SolicitudCompra.objects.create(area=f'Area {CLAVE} {texto}', fo_solicitante=dueno, fo_mod_compras=mod_com)

        # Reportes
        mod_rep = ModuloReportes.objects.create(fo_sistema=sistema)
        cls.tipos = {c: TipoReporte.objects.create(nombre_tipo=c.capitalize(), origen='sistema', clave=c, fo_mod_reportes=mod_rep)
                     for c in ('capacitacion', 'soporte', 'asistente', 'consolidado')}
        tipo_archivo = TipoReporte.objects.create(nombre_tipo='Ventas', origen='archivo', fo_mod_reportes=mod_rep)
        cls.rrhh, cls.otro_rrhh = cls.usuarios['recursos_humanos'], crear_usuario('recursos_humanos', 'rrhh2@prueba.test')
        for clave, dueno in (('capacitacion', cls.rrhh), ('soporte', cls.rrhh), ('consolidado', cls.rrhh),
                             ('consolidado', cls.otro_rrhh)):
            Reporte.objects.create(titulo=f'Informe {CLAVE} {clave} de {dueno.pk}', fo_tipo_reporte=cls.tipos[clave],
                                   fo_mod_reportes=mod_rep, fo_usuario=dueno)
        for i, dueno in enumerate((cls.rrhh, cls.otro_rrhh)):
            ArchivoImportado.objects.create(titulo=f'Archivo {CLAVE} {i}', archivo=ContentFile(b'a,b', name=f'a{i}.csv'),
                                            formato='csv', fo_tipo=tipo_archivo, huella=str(i) * 64, fo_usuario=dueno,
                                            fo_mod_reportes=mod_rep)

    @classmethod
    def crear_documento(cls, titulo):
        return Documento.objects.create(titulo=titulo, version='1', archivo=ContentFile(b'd', name='d.pdf'),
                                        fo_tipo_documento=cls.tipo_doc, fo_mod_doc=cls.mod_doc,
                                        fo_categoria_documento=cls.cat_doc)

    def setUp(self):
        # El límite de uso vive en la caché: se limpia para que las pruebas no se afecten entre sí.
        cache.clear()

    def buscar(self, usuario, q=CLAVE):
        cliente = APIClient()
        cliente.force_authenticate(usuario)
        return cliente.get('/api/buscar/', {'q': q})

    def grupos(self, usuario, q=CLAVE):
        respuesta = self.buscar(usuario, q)
        self.assertEqual(respuesta.status_code, 200)
        return {g['modulo']: g for g in respuesta.data['grupos']}

    def titulos(self, usuario, modulo, q=CLAVE):
        grupo = self.grupos(usuario, q).get(modulo)
        return [r['titulo'] for r in grupo['resultados']] if grupo else []


class AlcancePorRolTests(BaseBusquedaTests):
    def test_cada_rol_solo_recibe_grupos_de_modulos_visibles(self):
        for rol in TODOS_LOS_ROLES:
            visibles = {m['clave'] for m in modulos_visibles(rol)} | {'paginas'}
            self.assertLessEqual(set(self.grupos(self.usuarios[rol])), visibles, rol)

    def test_grupos_esperados_por_rol(self):
        base = {'capacitacion', 'documentos', 'inventario'}
        esperado = {
            'administrador': base | {'usuarios', 'proveedores', 'soporte', 'compras', 'recursos', 'reportes'},
            'empleado': base | {'soporte', 'recursos', 'compras'},
            'supervisor': base | {'compras', 'proveedores', 'reportes'},
            'tecnico_soporte': base | {'soporte'},
            'proveedor_contenido': base,
            'recursos_humanos': base | {'usuarios', 'proveedores', 'reportes'},
        }
        for rol, grupos in esperado.items():
            self.assertEqual(set(self.grupos(self.usuarios[rol])) - {'paginas'}, grupos, rol)

    def test_un_modulo_invisible_ni_se_consulta(self):
        espia = mock.Mock(return_value=[])
        with mock.patch.dict(BUSCADORES, {'proveedores': espia, 'reportes': espia, 'usuarios': espia}):
            self.buscar(self.usuarios['proveedor_contenido'])
            espia.assert_not_called()

    def test_usuarios_solo_para_quienes_los_gestionan_y_sin_datos_privados(self):
        self.assertNotIn('usuarios', self.grupos(self.usuarios['supervisor'], 'Persona'))
        grupo = self.grupos(self.usuarios['recursos_humanos'], 'Persona')['usuarios']
        self.assertEqual(len(grupo['resultados']), 5)
        # Por correo y por puesto (solo para esos roles).
        self.assertIn('usuarios', self.grupos(self.usuarios['administrador'], 'sensible@prueba'))
        puesto = self.grupos(self.usuarios['recursos_humanos'], 'analista zafiro')['usuarios']['resultados']
        self.assertEqual([(r['titulo'], r['subtitulo']) for r in puesto], [('Persona empleado', f'Analista {CLAVE}')])


class AislamientoTests(BaseBusquedaTests):
    def test_el_empleado_solo_encuentra_lo_suyo(self):
        self.assertEqual(self.titulos(self.empleado, 'soporte'), [f'Ticket {CLAVE} propio'])
        self.assertEqual(set(self.titulos(self.otro, 'soporte')), {f'Ticket {CLAVE} ajeno', f'Ticket {CLAVE} del tecnico'})
        pedidos = self.grupos(self.empleado)['recursos']['resultados']
        self.assertEqual([r['subtitulo'] for r in pedidos], ['Pedido propio'])
        solicitudes = [r for r in self.grupos(self.empleado)['compras']['resultados'] if r['titulo'].startswith('Solicitud')]
        self.assertEqual([r['titulo'] for r in solicitudes], [f'Solicitud · Area {CLAVE} propia'])

    def test_el_tecnico_ve_asignados_a_el_y_sin_asignar_pero_no_los_de_otro_tecnico(self):
        titulos = set(self.titulos(self.usuarios['tecnico_soporte'], 'soporte'))
        self.assertEqual(titulos, {f'Ticket {CLAVE} propio', f'Ticket {CLAVE} del tecnico'})

    def test_el_administrador_ve_todo_y_a_gestion(self):
        admin = self.usuarios['administrador']
        self.assertEqual(len(self.titulos(admin, 'soporte')), 3)
        grupos = self.grupos(admin)
        self.assertEqual(len(grupos['recursos']['resultados']), 3)  # 2 pedidos + el tipo del catálogo
        self.assertTrue(grupos['soporte']['resultados'][0]['ruta'].startswith('/soporte?vista=gestion&q='))

    def test_las_rutas_dependen_de_la_pestana_del_rol(self):
        self.assertTrue(self.grupos(self.empleado)['soporte']['resultados'][0]['ruta'].startswith('/soporte?vista=reportar&q='))
        compras = {r['titulo']: r['ruta'] for r in self.grupos(self.empleado)['compras']['resultados']}
        self.assertTrue(compras[f'Solicitud · Area {CLAVE} propia'].startswith('/compras?vista=mis-solicitudes&q='))
        self.assertTrue(compras[f'Articulo {CLAVE}'].startswith('/compras?vista=tienda&q='))
        encargado = {r['titulo']: r['ruta'] for r in self.grupos(self.usuarios['encargado_administrativo'])['compras']['resultados']}
        self.assertTrue(encargado[f'Articulo {CLAVE} oculto'].startswith('/compras?vista=catalogo&q='))

    def test_el_solicitante_no_ve_articulos_no_disponibles_y_el_directivo_no_recibe_articulos(self):
        titulos = self.titulos(self.empleado, 'compras')
        self.assertIn(f'Articulo {CLAVE}', titulos)
        self.assertNotIn(f'Articulo {CLAVE} oculto', titulos)
        directivo = self.titulos(self.usuarios['directivo'], 'compras')
        self.assertEqual(len(directivo), 2)  # solo las dos solicitudes
        self.assertTrue(all(t.startswith('Solicitud') for t in directivo))

    def test_reportes_por_tipo_permitido_y_archivos_propios(self):
        supervisor = self.titulos(self.usuarios['supervisor'], 'reportes')
        self.assertEqual(len(supervisor), 1)
        self.assertIn('capacitacion', supervisor[0])
        rrhh = self.titulos(self.rrhh, 'reportes')
        # Capacitación y su consolidado, pero no el de otro usuario ni el de soporte; y sus archivos, no los ajenos.
        self.assertEqual(sum(t.startswith('Informe') for t in rrhh), 2)
        self.assertFalse(any('soporte' in t for t in rrhh))
        self.assertEqual([t for t in rrhh if t.startswith('Archivo')], [f'Archivo {CLAVE} 0'])
        self.assertEqual(self.titulos(self.usuarios['encargado_documental'], 'reportes'), [])
        admin = self.titulos(self.usuarios['administrador'], 'reportes')
        self.assertEqual(len(admin), 5)  # tope por módulo (hay 4 informes + 2 archivos)


class CamposSensiblesTests(BaseBusquedaTests):
    def test_no_se_encuentra_nada_por_cedula_telefono_rut_ni_contacto(self):
        for valor in (CEDULA, TELEFONO, '5551234', RUT, '99887766', 'Reservado', 'contacto@prov.test'):
            self.assertEqual(self.buscar(self.usuarios['administrador'], valor).data['total'], 0, valor)
            respuesta = self.buscar(self.usuarios['administrador'], valor)
            self.assertEqual(respuesta.status_code, 200)
            cuerpo = str(respuesta.data['grupos'])  # `q` repite lo buscado; los datos van en los grupos
            for privado in (CEDULA, TELEFONO, RUT, CONTACTO):
                self.assertNotIn(privado, cuerpo)
        for valor in (CEDULA, TELEFONO, RUT, 'Reservado'):
            self.assertEqual(self.buscar(self.usuarios['recursos_humanos'], valor).data['total'], 0, valor)

    def test_la_respuesta_nunca_incluye_datos_privados(self):
        cuerpo = str(self.buscar(self.usuarios['administrador'], 'Persona').data)
        for privado in (CEDULA, TELEFONO, 'password'):
            self.assertNotIn(privado, cuerpo)


class ValidacionDelTextoTests(BaseBusquedaTests):
    def test_menos_de_dos_caracteres_responde_vacio(self):
        for q in ('', ' ', 'a', ' a '):
            respuesta = self.buscar(self.empleado, q)
            self.assertEqual((respuesta.status_code, respuesta.data['grupos'], respuesta.data['total']), (200, [], 0), repr(q))

    def test_sin_parametro_q_responde_vacio(self):
        cliente = APIClient()
        cliente.force_authenticate(self.empleado)
        self.assertEqual(cliente.get('/api/buscar/').data['grupos'], [])

    def test_sesenta_caracteres_pasan_y_sesenta_y_uno_dan_400(self):
        self.assertEqual(self.buscar(self.empleado, 'a' * 60).status_code, 200)
        respuesta = self.buscar(self.empleado, 'a' * 61)
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('60', str(respuesta.data['q']))

    def test_el_texto_se_recorta_antes_de_medirse(self):
        self.assertEqual(self.buscar(self.empleado, '  ' + 'a' * 60 + '  ').status_code, 200)

    def test_los_comodines_de_sql_se_tratan_como_texto(self):
        self.assertEqual(self.buscar(self.usuarios['administrador'], '%%').data['total'], 0)
        self.assertEqual(self.buscar(self.usuarios['administrador'], "zaf'; DROP TABLE usuario;--").data['total'], 0)
        self.assertTrue(Usuario.objects.exists())

    def test_insensible_a_mayusculas(self):
        self.assertEqual(self.titulos(self.empleado, 'soporte', 'ZAFIRO'), [f'Ticket {CLAVE} propio'])


class RutasTests(BaseBusquedaTests):
    def test_funcion_de_ruta_codifica_y_no_lleva_ids(self):
        ruta = ruta_resultado('/soporte', 'gestion', 'a b"c&d#e?f')
        self.assertEqual(ruta, '/soporte?vista=gestion&q=a%20b%22c%26d%23e%3Ff')
        self.assertEqual(ruta_resultado('/inventario', None, 'ñandú'), '/inventario?q=%C3%B1and%C3%BA')
        self.assertEqual(ruta_resultado('/x', None, ''), '/x')

    def test_texto_con_caracteres_especiales_viaja_codificado_y_se_recupera_igual(self):
        texto = f'{CLAVE} "q" & #x ?y'
        self.crear_documento(f'Documento {texto}')
        ruta = self.grupos(self.empleado, texto)['documentos']['resultados'][0]['ruta']
        partes = urlsplit(ruta)
        self.assertEqual(partes.path, '/documentos')
        self.assertEqual(partes.fragment, '')
        self.assertEqual(parse_qs(partes.query)['q'], [texto])
        self.assertRegex(ruta, RUTA_VALIDA)

    def test_todas_las_rutas_son_de_lista_sin_ids(self):
        for rol in TODOS_LOS_ROLES:
            for grupo in self.grupos(self.usuarios[rol]).values():
                for resultado in grupo['resultados']:
                    self.assertRegex(resultado['ruta'], RUTA_VALIDA, f'{rol}: {resultado["ruta"]}')
                    self.assertEqual(urlsplit(resultado['ruta']).path.count('/'), 1)


class PaginasTests(BaseBusquedaTests):
    def paginas(self, usuario, q):
        grupo = self.grupos(usuario, q).get('paginas')
        return [(r['titulo'], r['ruta']) for r in grupo['resultados']] if grupo else []

    def test_palabras_clave_llevan_al_modulo(self):
        self.assertIn(('Soporte técnico', '/soporte'), self.paginas(self.empleado, 'tickets'))
        self.assertIn(('Soporte técnico', '/soporte'), self.paginas(self.empleado, 'ayuda técnica'))
        self.assertIn(('Capacitación', '/capacitacion'), self.paginas(self.empleado, 'cursos'))
        self.assertIn(('Compras internas', '/compras'), self.paginas(self.empleado, 'cotizaciones'))
        self.assertIn(('Pedido de recursos', '/recursos'), self.paginas(self.empleado, 'pedidos'))
        self.assertIn(('Triny AI', '/triny'), self.paginas(self.empleado, 'asistente'))

    def test_sin_tildes_ni_mayusculas(self):
        self.assertIn(('Administrador', '/administrador'), self.paginas(self.usuarios['administrador'], 'BITACORA'))
        self.assertIn(('Administrador', '/administrador'), self.paginas(self.usuarios['administrador'], 'Auditoría'))
        self.assertEqual(normalizar('Capacitación ÁÉÍ'), 'capacitacion aei')

    def test_solo_paginas_visibles_para_el_rol(self):
        self.assertEqual(self.paginas(self.empleado, 'bitácora'), [])
        self.assertEqual([p for p in self.paginas(self.usuarios['proveedor_contenido'], 'proveedores')], [])


class TopesYLimitesTests(BaseBusquedaTests):
    def test_maximo_cinco_resultados_por_modulo(self):
        for i in range(8):
            self.crear_documento(f'Masivo {i}')
        self.assertEqual(len(self.grupos(self.empleado, 'Masivo')['documentos']['resultados']), 5)

    def test_tope_total(self):
        with mock.patch('busqueda.views.MAX_TOTAL', 3):
            for i in range(6):
                self.crear_documento(f'Masivo {i}')
            respuesta = self.buscar(self.empleado, 'Masivo')
            self.assertEqual(respuesta.data['total'], 3)

    def test_consultas_acotadas_sin_n_mas_uno(self):
        with CaptureQueriesContext(connection) as pocas:
            self.buscar(self.usuarios['administrador'])
        for i in range(5):
            self.crear_documento(f'{CLAVE} extra {i}')
        with CaptureQueriesContext(connection) as muchas:
            self.buscar(self.usuarios['administrador'])
        self.assertEqual(len(pocas), len(muchas))
        self.assertLess(len(muchas), 40)

    def test_limite_de_uso_por_usuario(self):
        for _ in range(30):
            self.assertEqual(self.buscar(self.empleado).status_code, 200)
        self.assertEqual(self.buscar(self.empleado).status_code, 429)
        # Otro usuario tiene su propio contador.
        self.assertEqual(self.buscar(self.otro).status_code, 200)


class MetodosYAutenticacionTests(BaseBusquedaTests):
    def test_sin_token_401(self):
        self.assertEqual(APIClient().get('/api/buscar/', {'q': CLAVE}).status_code, 401)

    def test_solo_get(self):
        cliente = APIClient()
        cliente.force_authenticate(self.empleado)
        for metodo in (cliente.post, cliente.put, cliente.patch, cliente.delete):
            self.assertEqual(metodo('/api/buscar/?q=zafiro', {}, format='json').status_code, 405)

    def test_no_registra_auditoria(self):
        from administracion.models import LogAuditoria
        self.buscar(self.usuarios['administrador'])
        self.assertFalse(LogAuditoria.objects.exists())
