"""Pruebas de las rutas de destino de las notificaciones."""
from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from usuarios.models import Usuario

from . import rutas
from .models import Notificacion
from .utils import notificar


def crear_usuario(rol):
    return Usuario.objects.create_user(email=f'{rol}@prueba.test', nombre=rol, password='x', rol=rol)


def avisar(usuario, ruta='', mensaje='Mensaje de prueba'):
    notificar(usuario, mensaje, 'Asunto', 'Cuerpo', ruta=ruta)
    return Notificacion.objects.filter(fo_usuario=usuario).latest('id')


class NotificarConRutaTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.empleado = crear_usuario('empleado')
        cls.capacitador = crear_usuario('capacitador')

    def test_sin_ruta_queda_vacia_como_antes(self):
        self.assertEqual(avisar(self.empleado).ruta, '')

    def test_guarda_una_ruta_valida(self):
        self.assertEqual(avisar(self.empleado, '/compras').ruta, '/compras')
        self.assertEqual(avisar(self.empleado, '/soporte?vista=reportar').ruta, '/soporte?vista=reportar')

    def test_descarta_rutas_inseguras_y_avisa_en_el_log(self):
        for ruta in ('http://malo.test/compras', 'javascript:alert(1)', '//malo.test', '/compras//x', 'compras',
                     '/compras/12', '/compras?vista=a&x=1', '/compras?vista=<b>', '/', '/compras\\x',
                     '/' + 'a' * 130, 123):
            with self.assertLogs('notificaciones.rutas', 'WARNING'):
                notificacion = avisar(self.empleado, ruta)
            self.assertEqual(notificacion.ruta, '', ruta)

    def test_descarta_modulos_inexistentes_o_sin_acceso_del_destinatario(self):
        with self.assertLogs('notificaciones.rutas', 'WARNING'):
            self.assertEqual(avisar(self.empleado, '/administrador').ruta, '')
        with self.assertLogs('notificaciones.rutas', 'WARNING'):
            self.assertEqual(avisar(self.empleado, '/inexistente').ruta, '')
        with self.assertLogs('notificaciones.rutas', 'WARNING'):
            # El capacitador no tiene Compras.
            self.assertEqual(avisar(self.capacitador, '/compras').ruta, '')
        self.assertEqual(avisar(self.capacitador, '/capacitacion').ruta, '/capacitacion')

    def test_una_ruta_invalida_no_rompe_ni_impide_la_notificacion(self):
        self.assertEqual(Notificacion.objects.count(), 0)
        avisar(self.empleado, 'http://x')
        self.assertEqual(Notificacion.objects.count(), 1)


class RutasPorEventoTests(TestCase):
    def test_cada_destino_es_valido_para_su_destinatario(self):
        casos = {
            rutas.COMPRA_NUEVA: ['administrador', 'directivo', 'encargado_administrativo'],
            rutas.COMPRA_OBSERVACION: ['administrador', 'directivo'],
            rutas.COMPRA_DECISION: ['empleado', 'supervisor'],
            rutas.COMPRA_COMPRADA: ['empleado', 'supervisor', 'encargado_administrativo'],
            rutas.COMPRA_ENTREGADA: ['empleado', 'supervisor'],
            rutas.COMPRA_RECIBIDA: ['encargado_administrativo'],
            rutas.COMPRA_RECLAMO: ['encargado_administrativo', 'administrador'],
            rutas.ORDEN_COMPRA_ENTREGADA: ['empleado'],
            rutas.RECURSO_NUEVO: ['encargado_formacion'],
            rutas.RECURSO_DISPONIBILIDAD: ['empleado'],
            rutas.RECURSO_DECISION: ['empleado'],
            rutas.RECURSO_ENTREGADO: ['empleado'],
            rutas.TICKET_ASIGNADO: ['tecnico_soporte'],
            rutas.TICKET_ESTADO: ['empleado'],
            rutas.CAPACITACION_INSCRITO: ['empleado'],
            rutas.NECESIDAD_NUEVA: ['administrador', 'recursos_humanos'],
            rutas.COTIZACION_APROBADA: ['encargado_administrativo', 'administrador'],
            rutas.ACUERDO_PENDIENTE: ['administrador', 'directivo'],
            rutas.ACUERDO_DECISION: ['administrador', 'recursos_humanos', 'encargado_administrativo'],
        }
        self.assertEqual(set(casos), {e for e, d in rutas.DESTINOS.items() if d is not None})
        for evento, roles in casos.items():
            for rol in roles:
                usuario = Usuario(rol=rol)
                ruta = rutas.ruta_de_evento(evento, rol)
                self.assertEqual(rutas.ruta_valida(ruta, usuario), ruta, f'{evento} -> {rol}: {ruta}')

    def test_la_pestana_depende_del_rol_donde_hace_falta(self):
        self.assertEqual(rutas.ruta_de_evento(rutas.COMPRA_COMPRADA, 'empleado'), '/compras?vista=mis-solicitudes')
        self.assertEqual(rutas.ruta_de_evento(rutas.COMPRA_COMPRADA, 'encargado_administrativo'), '/compras?vista=solicitudes')
        self.assertEqual(rutas.ruta_de_evento(rutas.TICKET_ASIGNADO, 'tecnico_soporte'), '/soporte?vista=gestion')
        self.assertEqual(rutas.ruta_de_evento(rutas.ORDEN_COMPRA_ENTREGADA, 'empleado'), '/compras')
        self.assertEqual(rutas.ruta_de_evento(rutas.CUENTA_CREADA, 'empleado'), '')


class SerializerYApiTests(TestCase):
    def test_la_api_expone_ruta_y_no_permite_escribirla(self):
        usuario = crear_usuario('empleado')
        notificacion = avisar(usuario, '/recursos?vista=mis-pedidos')
        cliente = APIClient()
        cliente.force_authenticate(usuario)
        datos = cliente.get('/api/notificaciones/').data
        self.assertEqual(datos[0]['ruta'], '/recursos?vista=mis-pedidos')
        self.assertEqual(cliente.patch(f'/api/notificaciones/{notificacion.pk}/', {'ruta': '/x'}, format='json').status_code, 405)
        # Marcar como leída no toca la ruta.
        respuesta = cliente.post(f'/api/notificaciones/{notificacion.pk}/marcar_leida/')
        self.assertEqual((respuesta.data['leida'], respuesta.data['ruta']), (True, '/recursos?vista=mis-pedidos'))


class ComandoRutasAntiguasTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.empleado = crear_usuario('empleado')
        cls.tecnico = crear_usuario('tecnico_soporte')
        crear = Notificacion.objects.create
        crear(mensaje='Tu solicitud de compra #5 fue aprobada. Motivo: ok', fo_usuario=cls.empleado)
        crear(mensaje='Tu solicitud de compra #9 fue rechazada. Motivo: no', fo_usuario=cls.empleado, leida=True)
        crear(mensaje='Se te asignó el ticket #3: no imprime', fo_usuario=cls.tecnico)
        crear(mensaje='Se creó tu cuenta en TRAINET. Revisa tu correo.', fo_usuario=cls.empleado)
        crear(mensaje='Algo raro #1 "x"', fo_usuario=cls.empleado)
        crear(mensaje='Algo raro #22 "y"', fo_usuario=cls.empleado)
        crear(mensaje='Tu pedido', fo_usuario=cls.empleado, ruta='/compras')

    def ejecutar(self, *args):
        salida = StringIO()
        call_command('asignar_rutas_notificaciones', *args, stdout=salida)
        return salida.getvalue()

    def test_dry_run_no_escribe(self):
        texto = self.ejecutar()
        self.assertIn('DRY-RUN', texto)
        self.assertIn('Asignadas: 3', texto)
        self.assertEqual(Notificacion.objects.filter(ruta='').count(), 6)

    def test_aplicar_asigna_es_idempotente_y_respeta_leida_y_mensaje(self):
        antes = {n.pk: (n.mensaje, n.leida) for n in Notificacion.objects.all()}
        texto = self.ejecutar('--aplicar')
        self.assertIn('Asignadas: 3', texto)
        self.assertIn('/compras: 2', texto)
        self.assertIn('/soporte: 1', texto)
        # Los dos mensajes desconocidos se agrupan en un único patrón, sin números.
        self.assertIn('[2] Algo raro # "…"', texto)
        rutas_ = dict(Notificacion.objects.values_list('mensaje', 'ruta'))
        self.assertEqual(rutas_['Tu solicitud de compra #5 fue aprobada. Motivo: ok'], '/compras?vista=mis-solicitudes')
        self.assertEqual(rutas_['Se te asignó el ticket #3: no imprime'], '/soporte?vista=gestion')
        self.assertEqual(rutas_['Se creó tu cuenta en TRAINET. Revisa tu correo.'], '')
        self.assertEqual(rutas_['Tu pedido'], '/compras')
        self.assertEqual({n.pk: (n.mensaje, n.leida) for n in Notificacion.objects.all()}, antes)
        # Segunda corrida: nada que cambiar.
        self.assertIn('Asignadas: 0', self.ejecutar('--aplicar'))
