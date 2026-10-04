from django.test import TestCase
from rest_framework.test import APIClient

from administracion.models import LogAuditoria, ModuloAdministracion, SistemaTrainet
from reportes.models import Reporte
from usuarios.models import Usuario


class DashboardApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.sistema = SistemaTrainet.objects.create(version='1.0', fecha_instalacion='2026-01-01')
        ModuloAdministracion.objects.create(fo_sistema=cls.sistema)

    def cliente(self, rol):
        usuario = Usuario.objects.create_user(email=f'{rol}@prueba.test', nombre=rol, password='x', rol=rol)
        cliente = APIClient()
        cliente.force_authenticate(usuario)
        return cliente

    def test_sin_token_401(self):
        self.assertEqual(APIClient().get('/api/dashboard/').status_code, 401)

    def test_empleado_recibe_403(self):
        self.assertEqual(self.cliente('empleado').get('/api/dashboard/').status_code, 403)

    def test_administrador_y_directivo_reciben_el_contenido_general(self):
        for rol in ('administrador', 'directivo'):
            respuesta = self.cliente(rol).get('/api/dashboard/')
            self.assertEqual(respuesta.status_code, 200)
            self.assertEqual(set(respuesta.data), {'titulo', 'subtitulo', 'generado_en', 'indicadores', 'secciones', 'graficos'})

    def test_es_una_lectura_pura_no_crea_informes_ni_bitacora(self):
        informes, eventos = Reporte.objects.count(), LogAuditoria.objects.count()
        self.cliente('administrador').get('/api/dashboard/')
        self.assertEqual((Reporte.objects.count(), LogAuditoria.objects.count()), (informes, eventos))

    def test_periodo_opcional_y_validado(self):
        cliente = self.cliente('directivo')
        self.assertEqual(cliente.get('/api/dashboard/?desde=2026-01-01&hasta=2026-01-31').status_code, 200)
        self.assertEqual(cliente.get('/api/dashboard/?desde=2026-02-01&hasta=2026-01-01').status_code, 400)

    def test_solo_lectura_405(self):
        cliente = self.cliente('administrador')
        for metodo in (cliente.post, cliente.put, cliente.patch, cliente.delete):
            self.assertEqual(metodo('/api/dashboard/', {}, format='json').status_code, 405)
