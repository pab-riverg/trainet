"""Pruebas de permisos de Reportes: matriz rol x acción, filtrado por tipo y archivos propios vs ajenos."""
import shutil
import tempfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from administracion.models import LogAuditoria, ModuloAdministracion, SistemaTrainet
from usuarios.models import Usuario

from .models import ArchivoImportado, ModuloReportes, Reporte, TipoReporte
from .permisos import (
    PERMISOS_REPORTES,
    ROLES_LECTURA_REPORTES,
    puede_consolidar,
    puede_importar,
    puede_usar_tipo,
    tipos_permitidos,
)

TODOS_LOS_ROLES = [codigo for codigo, _ in Usuario.ROL_CHOICES]
CLAVES_SISTEMA = ['soporte', 'recursos', 'compras', 'capacitacion', 'proveedores', 'asistente', 'general']
# Resultado esperado al generar cada tipo, por rol con acceso a Reportes (los demás roles reciben siempre 403).
TIPOS_GENERABLES = {
    'administrador': set(CLAVES_SISTEMA),
    'directivo': set(CLAVES_SISTEMA),
    'recursos_humanos': {'capacitacion', 'asistente'},
    'supervisor': {'capacitacion', 'recursos'},
    'encargado_documental': set(),
}
_TEMP_MEDIA = tempfile.mkdtemp(prefix='trainet_pruebas_')


def crear_usuario(rol, correo=None):
    return Usuario.objects.create_user(email=correo or f'{rol}@prueba.test', nombre=f'Prueba {rol}', password='x', rol=rol)


@override_settings(MEDIA_ROOT=_TEMP_MEDIA)
class BaseReportesTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(_TEMP_MEDIA, ignore_errors=True)

    @classmethod
    def setUpTestData(cls):
        sistema = SistemaTrainet.objects.create(version='1.0', fecha_instalacion=timezone.localdate())
        ModuloAdministracion.objects.create(fo_sistema=sistema)
        cls.modulo = ModuloReportes.objects.create(fo_sistema=sistema)
        cls.tipos = {
            clave: TipoReporte.objects.create(nombre_tipo=clave.capitalize(), origen='sistema', clave=clave,
                                              fo_mod_reportes=cls.modulo)
            for clave in CLAVES_SISTEMA + ['consolidado']
        }
        cls.tipo_archivo = TipoReporte.objects.create(nombre_tipo='Ventas', origen='archivo', fo_mod_reportes=cls.modulo)
        cls.usuarios = {rol: crear_usuario(rol) for rol in TODOS_LOS_ROLES}
        cls.otro_rrhh = crear_usuario('recursos_humanos', 'otro_rrhh@prueba.test')

    def cliente(self, usuario):
        cliente = APIClient()
        cliente.force_authenticate(usuario)
        return cliente

    def como(self, rol):
        return self.cliente(self.usuarios[rol])

    def importar(self, usuario, nombre='datos'):
        """Importa un CSV distinto en cada llamada (la huella es única) como `usuario`."""
        contenido = f'producto,cantidad\n{nombre},{ArchivoImportado.objects.count() + 1}\nB,2\n'.encode()
        respuesta = self.cliente(usuario).post('/api/archivos-importados/', {
            'titulo': nombre, 'fo_tipo': self.tipo_archivo.pk, 'fecha_documento': '2026-01-15',
            'archivo': SimpleUploadedFile(f'{nombre}.csv', contenido, content_type='text/csv'),
        }, format='multipart')
        self.assertEqual(respuesta.status_code, 201, respuesta.content)
        return ArchivoImportado.objects.get(pk=respuesta.data['id'])

    @classmethod
    def informe(cls, clave, usuario=None):
        return Reporte.objects.create(titulo=f'Informe {clave}', fo_tipo_reporte=cls.tipos[clave],
                                      fo_mod_reportes=cls.modulo, fo_usuario=usuario)


class ModeloDePermisosTests(BaseReportesTests):
    def test_tipos_permitidos_por_rol(self):
        u = self.usuarios
        self.assertIsNone(tipos_permitidos(u['administrador']))
        self.assertIsNone(tipos_permitidos(u['directivo']))
        # Quien consolida ve el consolidado que produce aunque su lista de tipos no lo nombre.
        self.assertEqual(tipos_permitidos(u['recursos_humanos']), {'capacitacion', 'asistente', 'consolidado'})
        self.assertEqual(tipos_permitidos(u['supervisor']), {'capacitacion', 'recursos'})
        self.assertEqual(tipos_permitidos(u['encargado_documental']), {'consolidado'})
        self.assertEqual(tipos_permitidos(u['empleado']), frozenset())

    def test_importar_y_consolidar_por_rol(self):
        for rol in TODOS_LOS_ROLES:
            usuario = self.usuarios[rol]
            esperado = PERMISOS_REPORTES.get(rol, {})
            self.assertEqual(puede_importar(usuario), esperado.get('puede_importar', False), rol)
            self.assertEqual(puede_consolidar(usuario), esperado.get('puede_consolidar', False), rol)
        self.assertFalse(puede_importar(self.usuarios['supervisor']))
        self.assertFalse(puede_importar(self.usuarios['directivo']))
        self.assertTrue(puede_usar_tipo(self.usuarios['supervisor'], 'recursos'))
        self.assertFalse(puede_usar_tipo(self.usuarios['supervisor'], 'asistente'))

    def test_roles_de_lectura_son_los_del_modelo(self):
        self.assertEqual(set(ROLES_LECTURA_REPORTES),
                         {'administrador', 'directivo', 'supervisor', 'recursos_humanos', 'encargado_documental'})


class TiposReporteTests(BaseReportesTests):
    def claves(self, rol, origen='sistema'):
        respuesta = self.como(rol).get(f'/api/tipos-reporte/?origen={origen}')
        self.assertEqual(respuesta.status_code, 200, rol)
        return {t['clave'] for t in respuesta.data}

    def test_sistema_solo_los_tipos_permitidos(self):
        # El consolidado nunca aparece en origen=sistema: se genera desde Archivos.
        self.assertEqual(self.claves('administrador'), set(CLAVES_SISTEMA))
        self.assertEqual(self.claves('directivo'), set(CLAVES_SISTEMA))
        self.assertEqual(self.claves('recursos_humanos'), {'capacitacion', 'asistente'})
        self.assertEqual(self.claves('supervisor'), {'capacitacion', 'recursos'})
        self.assertEqual(self.claves('encargado_documental'), set())

    def test_sin_filtro_de_origen_incluye_consolidado_solo_a_quien_corresponde(self):
        todos = {t['clave'] for t in self.como('administrador').get('/api/tipos-reporte/').data}
        self.assertIn('consolidado', todos)
        rrhh = {t['clave'] for t in self.como('recursos_humanos').get('/api/tipos-reporte/').data if t['clave']}
        self.assertEqual(rrhh, {'capacitacion', 'asistente', 'consolidado'})
        supervisor = {t['clave'] for t in self.como('supervisor').get('/api/tipos-reporte/').data if t['clave']}
        self.assertEqual(supervisor, {'capacitacion', 'recursos'})

    def test_categorias_de_archivo_solo_para_quien_importa_o_lee_todo(self):
        for rol in ('administrador', 'directivo', 'recursos_humanos', 'encargado_documental'):
            self.assertEqual(len(self.como(rol).get('/api/tipos-reporte/?origen=archivo').data), 1, rol)
        self.assertEqual(self.como('supervisor').get('/api/tipos-reporte/?origen=archivo').data, [])

    def test_detalle_de_tipo_no_permitido_no_existe(self):
        self.assertEqual(self.como('supervisor').get(f'/api/tipos-reporte/{self.tipos["asistente"].pk}/').status_code, 404)
        self.assertEqual(self.como('supervisor').get(f'/api/tipos-reporte/{self.tipos["recursos"].pk}/').status_code, 200)

    def test_solo_el_administrador_modifica_tipos(self):
        for rol in ('directivo', 'supervisor', 'recursos_humanos', 'encargado_documental'):
            respuesta = self.como(rol).post('/api/tipos-reporte/', {'nombre_tipo': 'X', 'fo_mod_reportes': self.modulo.pk}, format='json')
            self.assertEqual(respuesta.status_code, 403, rol)

    def test_roles_sin_acceso_reciben_403_y_sin_token_401(self):
        for rol in set(TODOS_LOS_ROLES) - set(ROLES_LECTURA_REPORTES):
            for url in ('/api/tipos-reporte/', '/api/informes/', '/api/archivos-importados/'):
                self.assertEqual(self.como(rol).get(url).status_code, 403, f'{rol} {url}')
        self.assertEqual(APIClient().get('/api/tipos-reporte/').status_code, 401)


class GenerarInformeTests(BaseReportesTests):
    def test_matriz_rol_x_tipo(self):
        for rol in TODOS_LOS_ROLES:
            permitidos = TIPOS_GENERABLES.get(rol, set())
            for clave in CLAVES_SISTEMA:
                respuesta = self.como(rol).post('/api/informes/generar/', {'tipo': clave}, format='json')
                esperado = 201 if clave in permitidos else 403
                self.assertEqual(respuesta.status_code, esperado, f'{rol} genera {clave}: {respuesta.content[:200]}')

    def test_generar_por_id_de_un_tipo_no_permitido_es_403(self):
        respuesta = self.como('supervisor').post('/api/informes/generar/', {'tipo': self.tipos['asistente'].pk}, format='json')
        self.assertEqual(respuesta.status_code, 403)

    def test_tipo_inexistente_sigue_siendo_400(self):
        respuesta = self.como('administrador').post('/api/informes/generar/', {'tipo': 'no_existe'}, format='json')
        self.assertEqual(respuesta.status_code, 400)
        respuesta = self.como('supervisor').post('/api/informes/generar/', {}, format='json')
        self.assertEqual(respuesta.status_code, 400)

    def test_auditoria_registra_al_usuario_real(self):
        supervisor = self.usuarios['supervisor']
        self.como('supervisor').post('/api/informes/generar/', {'tipo': 'recursos'}, format='json')
        evento = LogAuditoria.objects.get(accion='informe_generado')
        self.assertEqual(evento.fo_usuario, supervisor)
        self.assertEqual(Reporte.objects.get().fo_usuario, supervisor)

    def test_generar_denegado_no_deja_informe_ni_auditoria(self):
        self.como('supervisor').post('/api/informes/generar/', {'tipo': 'asistente'}, format='json')
        self.assertFalse(Reporte.objects.exists())
        self.assertFalse(LogAuditoria.objects.filter(accion='informe_generado').exists())


class HistorialYDetalleTests(BaseReportesTests):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        cls.informes = {clave: cls.informe(clave) for clave in CLAVES_SISTEMA}
        cls.consolidado_rrhh = cls.informe('consolidado', cls.usuarios['recursos_humanos'])
        cls.consolidado_otro = cls.informe('consolidado', cls.otro_rrhh)

    def ids_historial(self, usuario):
        respuesta = self.cliente(usuario).get('/api/informes/')
        self.assertEqual(respuesta.status_code, 200)
        return {i['tipo_clave'] + ('*' if i['id'] == self.consolidado_otro.pk else '') for i in respuesta.data}

    def test_el_historial_solo_muestra_tipos_permitidos(self):
        self.assertEqual(len(self.como('administrador').get('/api/informes/').data), len(CLAVES_SISTEMA) + 2)
        self.assertEqual(len(self.como('directivo').get('/api/informes/').data), len(CLAVES_SISTEMA) + 2)
        self.assertEqual(self.ids_historial(self.usuarios['supervisor']), {'capacitacion', 'recursos'})
        self.assertEqual(self.ids_historial(self.usuarios['recursos_humanos']), {'capacitacion', 'asistente', 'consolidado'})

    def test_los_consolidados_solo_los_ve_quien_los_hizo(self):
        self.assertEqual(self.ids_historial(self.usuarios['encargado_documental']), set())
        self.assertEqual(self.ids_historial(self.otro_rrhh), {'capacitacion', 'asistente', 'consolidado*'})

    def test_filtro_por_tipo_no_permitido_no_amplia_el_alcance(self):
        respuesta = self.como('supervisor').get(f'/api/informes/?tipo={self.tipos["asistente"].pk}')
        self.assertEqual(respuesta.data, [])

    def test_detalle_y_exportacion_segun_tipo(self):
        for rol in ('administrador', 'directivo', 'recursos_humanos', 'supervisor', 'encargado_documental'):
            for clave in CLAVES_SISTEMA:
                informe = self.informes[clave]
                esperado = 200 if clave in (tipos_permitidos(self.usuarios[rol]) or CLAVES_SISTEMA) else 403
                self.assertEqual(self.como(rol).get(f'/api/informes/{informe.pk}/').status_code, esperado, f'{rol} detalle {clave}')
                exportar = self.como(rol).get(f'/api/informes/{informe.pk}/exportar/?formato=xlsx')
                self.assertEqual(exportar.status_code, 200 if esperado == 200 else 403, f'{rol} exporta {clave}')

    def test_consolidado_ajeno_es_403_y_el_propio_se_ve(self):
        rrhh, otro = self.como('recursos_humanos'), self.otro_rrhh
        self.assertEqual(rrhh.get(f'/api/informes/{self.consolidado_rrhh.pk}/').status_code, 200)
        self.assertEqual(rrhh.get(f'/api/informes/{self.consolidado_otro.pk}/').status_code, 403)
        self.assertEqual(rrhh.get(f'/api/informes/{self.consolidado_otro.pk}/exportar/?formato=pdf').status_code, 403)
        self.assertEqual(self.cliente(otro).get(f'/api/informes/{self.consolidado_otro.pk}/').status_code, 200)
        # Administrador y directivo ven cualquiera.
        for rol in ('administrador', 'directivo'):
            self.assertEqual(self.como(rol).get(f'/api/informes/{self.consolidado_otro.pk}/').status_code, 200)

    def test_exportar_registra_auditoria_con_el_usuario_real(self):
        supervisor = self.usuarios['supervisor']
        self.como('supervisor').get(f'/api/informes/{self.informes["recursos"].pk}/exportar/?formato=xlsx')
        self.assertEqual(LogAuditoria.objects.get(accion='informe_exportado').fo_usuario, supervisor)

    def test_solo_el_administrador_elimina_informes(self):
        informe = self.informes['capacitacion']
        for rol in ('directivo', 'supervisor', 'recursos_humanos', 'encargado_documental'):
            self.assertEqual(self.como(rol).delete(f'/api/informes/{informe.pk}/').status_code, 403, rol)
        self.assertEqual(self.como('administrador').delete(f'/api/informes/{informe.pk}/').status_code, 204)


class ArchivosImportadosTests(BaseReportesTests):
    def test_matriz_de_importacion(self):
        esperado = {'administrador': 201, 'recursos_humanos': 201, 'encargado_documental': 201,
                    'directivo': 403, 'supervisor': 403, 'empleado': 403, 'encargado_formacion': 403}
        for rol, codigo in esperado.items():
            contenido = f'a,b\n{rol},1\n'.encode()
            respuesta = self.como(rol).post('/api/archivos-importados/', {
                'titulo': rol, 'fo_tipo': self.tipo_archivo.pk, 'fecha_documento': '2026-01-15',
                'archivo': SimpleUploadedFile(f'{rol}.csv', contenido, content_type='text/csv'),
            }, format='multipart')
            self.assertEqual(respuesta.status_code, codigo, f'{rol}: {respuesta.content[:200]}')

    def test_importar_registra_auditoria_con_el_usuario_real(self):
        rrhh = self.importar(self.usuarios['recursos_humanos']).fo_usuario
        self.assertEqual(LogAuditoria.objects.get(accion='archivo_importado').fo_usuario, rrhh)

    def test_el_supervisor_no_ve_archivos(self):
        for url in ('/api/archivos-importados/', '/api/archivos-importados/carpetas/'):
            self.assertEqual(self.como('supervisor').get(url).status_code, 403, url)

    def test_cada_rol_ve_solo_sus_archivos_y_admin_directivo_todos(self):
        propio = self.importar(self.usuarios['recursos_humanos'], 'rrhh')
        ajeno = self.importar(self.otro_rrhh, 'otro')
        doc = self.importar(self.usuarios['encargado_documental'], 'doc')
        self.assertEqual({a['id'] for a in self.como('recursos_humanos').get('/api/archivos-importados/').data}, {propio.pk})
        self.assertEqual({a['id'] for a in self.como('encargado_documental').get('/api/archivos-importados/').data}, {doc.pk})
        for rol in ('administrador', 'directivo'):
            self.assertEqual({a['id'] for a in self.como(rol).get('/api/archivos-importados/').data},
                             {propio.pk, ajeno.pk, doc.pk}, rol)
        carpetas = self.como('recursos_humanos').get('/api/archivos-importados/carpetas/').data
        self.assertEqual(carpetas['total_general'], 1)
        self.assertEqual(self.como('administrador').get('/api/archivos-importados/carpetas/').data['total_general'], 3)

    def test_un_archivo_ajeno_no_existe_para_ningun_detalle(self):
        ajeno = self.importar(self.otro_rrhh, 'otro')
        rrhh = self.como('recursos_humanos')
        base = f'/api/archivos-importados/{ajeno.pk}/'
        for url in (base, base + 'descargar/', base + 'vista-previa/'):
            self.assertEqual(rrhh.get(url).status_code, 404, url)
        self.assertEqual(rrhh.post(base + 'archivar/').status_code, 404)
        self.assertEqual(rrhh.post(base + 'restaurar/').status_code, 404)
        self.assertEqual(rrhh.patch(base, {'titulo': 'robado'}, format='json').status_code, 404)
        self.assertEqual(rrhh.delete(base).status_code, 404)
        ajeno.refresh_from_db()
        self.assertTrue(ajeno.activo)
        self.assertEqual(ajeno.titulo, 'otro')

    def test_gestion_completa_de_los_archivos_propios(self):
        archivo = self.importar(self.usuarios['encargado_documental'], 'doc')
        doc, base = self.como('encargado_documental'), f'/api/archivos-importados/{archivo.pk}/'
        self.assertEqual(doc.get(base + 'vista-previa/').status_code, 200)
        self.assertEqual(doc.get(base + 'descargar/').status_code, 200)
        self.assertEqual(doc.patch(base, {'titulo': 'Nuevo título'}, format='json').status_code, 200)
        self.assertEqual(doc.delete(base).status_code, 400)  # activo: primero se archiva
        self.assertEqual(doc.post(base + 'archivar/').status_code, 200)
        self.assertEqual(doc.post(base + 'restaurar/').status_code, 200)
        doc.post(base + 'archivar/')
        self.assertEqual(doc.delete(base).status_code, 204)
        self.assertEqual(
            list(LogAuditoria.objects.order_by('id').values_list('accion', flat=True)),
            ['archivo_importado', 'archivo_archivado', 'archivo_restaurado', 'archivo_archivado', 'archivo_eliminado'])
        self.assertTrue(all(e.fo_usuario == self.usuarios['encargado_documental'] for e in LogAuditoria.objects.all()))

    def test_el_directivo_consulta_pero_no_gestiona(self):
        archivo = self.importar(self.usuarios['administrador'], 'admin')
        directivo, base = self.como('directivo'), f'/api/archivos-importados/{archivo.pk}/'
        self.assertEqual(directivo.get(base).status_code, 200)
        self.assertEqual(directivo.get(base + 'vista-previa/').status_code, 200)
        self.assertEqual(directivo.get(base + 'descargar/').status_code, 200)
        self.assertEqual(directivo.post(base + 'archivar/').status_code, 403)
        self.assertEqual(directivo.patch(base, {'titulo': 'x'}, format='json').status_code, 403)
        self.assertEqual(directivo.delete(base).status_code, 403)

    def test_el_administrador_gestiona_archivos_de_otros(self):
        archivo = self.importar(self.usuarios['recursos_humanos'], 'rrhh')
        admin, base = self.como('administrador'), f'/api/archivos-importados/{archivo.pk}/'
        self.assertEqual(admin.post(base + 'archivar/').status_code, 200)
        self.assertEqual(admin.delete(base).status_code, 204)

    def test_un_duplicado_ajeno_no_sugiere_restaurar(self):
        ajeno = self.importar(self.otro_rrhh, 'otro')
        self.como('administrador').post(f'/api/archivos-importados/{ajeno.pk}/archivar/')
        with ajeno.archivo.open('rb') as f:
            contenido = f.read()
        respuesta = self.como('recursos_humanos').post('/api/archivos-importados/', {
            'titulo': 'copia', 'fo_tipo': self.tipo_archivo.pk, 'fecha_documento': '2026-01-15',
            'archivo': SimpleUploadedFile('copia.csv', contenido, content_type='text/csv'),
        }, format='multipart')
        self.assertEqual(respuesta.status_code, 400)
        self.assertNotIn('Restáuralo', str(respuesta.data))


class ConsolidarTests(BaseReportesTests):
    def consolidar(self, rol, archivos):
        return self.como(rol).post('/api/informes/consolidar/', {'archivos': [a.pk for a in archivos]}, format='json')

    def test_matriz_de_consolidacion_con_archivos_propios(self):
        for rol in ('recursos_humanos', 'encargado_documental', 'administrador'):
            archivos = [self.importar(self.usuarios[rol], f'{rol}{i}') for i in range(2)]
            respuesta = self.consolidar(rol, archivos)
            self.assertEqual(respuesta.status_code, 201, f'{rol}: {respuesta.content[:200]}')
            self.assertEqual(Reporte.objects.get(pk=respuesta.data['id']).fo_usuario, self.usuarios[rol])

    def test_el_directivo_consolida_cualquier_archivo_como_hoy(self):
        archivos = [self.importar(self.usuarios['administrador'], f'a{i}') for i in range(2)]
        self.assertEqual(self.consolidar('directivo', archivos).status_code, 201)

    def test_sin_permiso_de_consolidar_es_403(self):
        archivos = [self.importar(self.usuarios['administrador'], f'a{i}') for i in range(2)]
        for rol in ('supervisor', 'empleado', 'encargado_formacion'):
            self.assertEqual(self.consolidar(rol, archivos).status_code, 403, rol)
        self.assertFalse(Reporte.objects.exists())

    def test_consolidar_archivos_ajenos_responde_como_inexistentes(self):
        mios = self.importar(self.usuarios['recursos_humanos'], 'mio')
        ajeno = self.importar(self.otro_rrhh, 'ajeno')
        respuesta = self.consolidar('recursos_humanos', [mios, ajeno])
        self.assertEqual(respuesta.status_code, 400)
        self.assertIn('no existe', str(respuesta.data))
        self.assertFalse(Reporte.objects.exists())

    def test_el_consolidado_propio_se_puede_ver_y_exportar_pero_no_el_ajeno(self):
        archivos = [self.importar(self.usuarios['recursos_humanos'], f'r{i}') for i in range(2)]
        informe_id = self.consolidar('recursos_humanos', archivos).data['id']
        self.assertEqual(self.como('recursos_humanos').get(f'/api/informes/{informe_id}/exportar/?formato=xlsx').status_code, 200)
        self.assertEqual(self.como('encargado_documental').get(f'/api/informes/{informe_id}/').status_code, 403)
        self.assertEqual(LogAuditoria.objects.get(accion='informe_consolidado').fo_usuario, self.usuarios['recursos_humanos'])
