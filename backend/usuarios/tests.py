from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient

from asistente.models import CategoriaAsistente, ConsultaFrecuente, ModuloAsistenteVirtual
from administracion.models import SistemaTrainet

from .models import Empleado, Supervisor, Usuario


def crear_usuario(rol, correo, **extra):
    return Usuario.objects.create_user(email=correo, nombre=f'Nombre {correo}', password='x', rol=rol, **extra)


class SupervisorEnPerfilTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.jefe = crear_usuario('supervisor', 'jefe@prueba.test', cedula='1234567890', telefono='0999111222')
        supervisor = Supervisor.objects.create(fo_usuario=cls.jefe)
        cls.empleado = crear_usuario('empleado', 'ana@prueba.test')
        Empleado.objects.create(fo_usuario=cls.empleado, puesto='Analista', fecha_ingreso=timezone.localdate(),
                                fo_supervisor=supervisor)
        cls.admin = crear_usuario('administrador', 'admin@prueba.test')

    def perfil(self, usuario):
        cliente = APIClient()
        cliente.force_authenticate(usuario)
        respuesta = cliente.get(f'/api/usuarios/{usuario.pk}/')
        self.assertEqual(respuesta.status_code, 200)
        return respuesta.data

    def test_empleado_con_supervisor(self):
        datos = self.perfil(self.empleado)
        self.assertEqual(datos['supervisor'], {'nombre': self.jefe.nombre, 'email': 'jefe@prueba.test'})

    def test_no_se_filtran_datos_sensibles_del_supervisor(self):
        datos = self.perfil(self.empleado)
        self.assertEqual(set(datos['supervisor']), {'nombre', 'email'})
        texto = str(datos['supervisor'])
        self.assertNotIn('1234567890', texto)
        self.assertNotIn('0999111222', texto)

    def test_empleado_sin_registro_de_supervisor_devuelve_null(self):
        sin_registro = crear_usuario('empleado', 'sinperfil@prueba.test')
        self.assertIsNone(self.perfil(sin_registro)['supervisor'])

    def test_usuario_que_no_es_empleado_devuelve_null(self):
        self.assertIsNone(self.perfil(self.admin)['supervisor'])
        self.assertIsNone(self.perfil(self.jefe)['supervisor'])

    def test_una_sola_consulta_extra_para_el_supervisor(self):
        with CaptureQueriesContext(connection) as consultas:
            self.perfil(self.empleado)
        propias = [c for c in consultas if 'FROM `empleado`' in c['sql'] and 'JOIN' in c['sql']]
        self.assertEqual(len(propias), 1)


class FaqParaTodosLosRolesTests(TestCase):
    """La ayuda reutiliza GET /api/consultas-frecuentes/: cualquier autenticado lee solo las activas."""

    @classmethod
    def setUpTestData(cls):
        sistema = SistemaTrainet.objects.create(version='1.0', fecha_instalacion=timezone.localdate())
        modulo = ModuloAsistenteVirtual.objects.create(fo_sistema=sistema)
        categoria = CategoriaAsistente.objects.create(nombre='Cuenta', fo_mod_asistente=modulo)
        ConsultaFrecuente.objects.create(pregunta='¿Activa?', respuesta='Sí', fo_categoria=categoria, fo_mod_asistente=modulo)
        ConsultaFrecuente.objects.create(pregunta='¿Oculta?', respuesta='No', activa=False, fo_mod_asistente=modulo)

    def test_todos_los_roles_leen_solo_las_activas(self):
        for codigo, _ in Usuario.ROL_CHOICES:
            cliente = APIClient()
            cliente.force_authenticate(crear_usuario(codigo, f'{codigo}@faq.test'))
            respuesta = cliente.get('/api/consultas-frecuentes/')
            self.assertEqual(respuesta.status_code, 200, codigo)
            if codigo != 'administrador':
                self.assertEqual([c['pregunta'] for c in respuesta.data], ['¿Activa?'], codigo)
            activa = next(c for c in respuesta.data if c['pregunta'] == '¿Activa?')
            self.assertEqual(activa['categoria_nombre'], 'Cuenta')

    def test_sin_token_401(self):
        self.assertEqual(APIClient().get('/api/consultas-frecuentes/').status_code, 401)
