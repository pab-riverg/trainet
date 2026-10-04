from io import StringIO

from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from administracion.models import SistemaTrainet
from usuarios.models import Usuario

from .models import CategoriaTicket, ModuloSoporteTecnico, TicketSoporte


class NormalizarEstadosTicketsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        sistema = SistemaTrainet.objects.create(version='1.0', fecha_instalacion=timezone.localdate())
        cls.modulo = ModuloSoporteTecnico.objects.create(fo_sistema=sistema)
        cls.categoria = CategoriaTicket.objects.create(nombre_categoria='Hardware')
        cls.usuario = Usuario.objects.create_user(email='u@prueba.test', nombre='U', password='x', rol='empleado')
        for texto, estado, prioridad in (
            ('antiguo', 'en proceso', 'media'),
            ('mayusculas', 'En Proceso ', 'Alta'),
            ('canonico', 'en_proceso', 'baja'),
            ('raro', 'inventado', 'urgente'),
        ):
            TicketSoporte.objects.create(descripcion=texto, estado=estado, prioridad=prioridad,
                                         fo_categoria_ticket=cls.categoria, fo_usuario=cls.usuario, fo_mod_soporte=cls.modulo)

    def ejecutar(self, *args):
        salida = StringIO()
        call_command('normalizar_estados_tickets', *args, stdout=salida)
        return salida.getvalue()

    def valores(self):
        return {t.descripcion: (t.estado, t.prioridad) for t in TicketSoporte.objects.all()}

    def test_dry_run_informa_y_no_escribe(self):
        antes = self.valores()
        texto = self.ejecutar()
        self.assertIn('DRY-RUN', texto)
        self.assertIn('Tickets a normalizar: 3', texto)
        self.assertEqual(self.valores(), antes)

    def test_aplicar_normaliza_y_es_idempotente(self):
        self.ejecutar('--aplicar')
        valores = self.valores()
        self.assertEqual(valores['antiguo'], ('en_proceso', 'media'))
        self.assertEqual(valores['mayusculas'], ('en_proceso', 'alta'))
        self.assertEqual(valores['canonico'], ('en_proceso', 'baja'))
        # Lo irreconocible no se toca y se informa.
        self.assertEqual(valores['raro'], ('inventado', 'urgente'))
        self.assertIn("'inventado'", self.ejecutar())
        self.assertIn('Tickets a normalizar: 0', self.ejecutar('--aplicar'))
        self.assertEqual(self.valores(), valores)
