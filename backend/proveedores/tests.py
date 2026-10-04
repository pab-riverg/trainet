"""Pruebas de permisos del directorio de proveedores."""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from administracion.models import SistemaTrainet
from usuarios.models import Usuario

from .models import ModuloGestionProveedores, Proveedor
from .permisos import ROLES_GESTION_PROVEEDORES, ROLES_LECTURA_PROVEEDORES

TODOS_LOS_ROLES = [codigo for codigo, _ in Usuario.ROL_CHOICES]


class PermisosProveedoresTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        sistema = SistemaTrainet.objects.create(version='1.0', fecha_instalacion=timezone.localdate())
        cls.modulo = ModuloGestionProveedores.objects.create(fo_sistema=sistema)
        cls.proveedor = Proveedor.objects.create(
            razon_social='Acme', contacto='Ana', email='a@acme.test', telefono='1', rut='1-9',
            especialidad='Cursos', fo_mod_prov=cls.modulo)
        cls.usuarios = {
            rol: Usuario.objects.create_user(email=f'{rol}@prueba.test', nombre=rol, password='x', rol=rol)
            for rol in TODOS_LOS_ROLES
        }

    def como(self, rol):
        cliente = APIClient()
        cliente.force_authenticate(self.usuarios[rol])
        return cliente

    def test_encargado_formacion_lee_el_directorio(self):
        cliente = self.como('encargado_formacion')
        self.assertEqual(cliente.get('/api/proveedores/').status_code, 200)
        self.assertEqual(cliente.get(f'/api/proveedores/{self.proveedor.pk}/').status_code, 200)
        self.assertEqual(cliente.get(f'/api/proveedores/{self.proveedor.pk}/historial/').status_code, 200)
        for recurso in ('servicios-proveedor', 'contratos-proveedor', 'cotizaciones-proveedor',
                        'necesidades-capacitacion-externa'):
            self.assertEqual(cliente.get(f'/api/{recurso}/').status_code, 200, recurso)

    def test_encargado_formacion_no_escribe(self):
        cliente = self.como('encargado_formacion')
        base = f'/api/proveedores/{self.proveedor.pk}/'
        self.assertEqual(cliente.post('/api/proveedores/', {'razon_social': 'X'}, format='json').status_code, 403)
        self.assertEqual(cliente.patch(base, {'razon_social': 'Y'}, format='json').status_code, 403)
        self.assertEqual(cliente.delete(base).status_code, 403)
        self.assertEqual(cliente.post('/api/necesidades-capacitacion-externa/', {}, format='json').status_code, 403)
        self.assertEqual(cliente.post('/api/contratos-proveedor/', {}, format='json').status_code, 403)
        self.assertEqual(cliente.post('/api/contratos-proveedor/1/decidir/', {}, format='json').status_code, 403)
        self.proveedor.refresh_from_db()
        self.assertEqual(self.proveedor.razon_social, 'Acme')

    def test_proveedor_de_contenido_no_entra(self):
        self.assertNotIn('proveedor_contenido', ROLES_LECTURA_PROVEEDORES)
        self.assertEqual(self.como('proveedor_contenido').get('/api/proveedores/').status_code, 403)

    def test_roles_de_lectura_y_gestion(self):
        self.assertEqual(set(ROLES_LECTURA_PROVEEDORES) - set(ROLES_GESTION_PROVEEDORES),
                         {'directivo', 'supervisor', 'encargado_formacion'})
        self.assertNotIn('encargado_formacion', ROLES_GESTION_PROVEEDORES)
        for rol in TODOS_LOS_ROLES:
            esperado = 200 if rol in ROLES_LECTURA_PROVEEDORES else 403
            self.assertEqual(self.como(rol).get('/api/proveedores/').status_code, esperado, rol)
