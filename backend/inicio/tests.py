from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from administracion.permisos import ROLES_ADMINISTRACION
from compras.models import ModuloComprasInternas, SolicitudCompra
from compras.permisos import ROLES_VISTA_COMPRAS
from administracion.models import ModuloAdministracion, SistemaTrainet
from capacitacion.models import (
    CategoriaCurso, Capacitacion, Curso, ModuloCapacitacion, ParticipanteCapacitacion, ProgresoCurso)
from proveedores.permisos import ROLES_LECTURA_PROVEEDORES
from reportes.permisos import ROLES_LECTURA_REPORTES
from soporte.models import CategoriaTicket, ModuloSoporteTecnico, TicketSoporte
from usuarios.models import Capacitador, Empleado, Supervisor, Usuario
from usuarios.permissions import ROLES_GESTION_USUARIOS
from usuarios.perfiles import ROL_MODELOS_PERFIL

from .modulos import TODOS_LOS_ROLES, modulos_visibles
from .tarjetas import tarjetas_para

TODOS = {codigo for codigo, _ in Usuario.ROL_CHOICES}


def crear_usuario(rol, correo=None):
    return Usuario.objects.create_user(email=correo or f'{rol}@prueba.test', nombre=f'Prueba {rol}', password='x', rol=rol)


class ModulosPorRolTests(TestCase):
    """El menú de cada rol debe coincidir con los permisos.py de cada módulo (única fuente de verdad)."""

    def claves(self, rol):
        return {m['clave'] for m in modulos_visibles(rol)}

    def test_modulos_coinciden_con_los_permisos_de_cada_modulo(self):
        for rol in TODOS_LOS_ROLES:
            claves = self.claves(rol)
            self.assertEqual('administrador' in claves, rol in ROLES_ADMINISTRACION, rol)
            self.assertEqual('compras' in claves, rol in ROLES_VISTA_COMPRAS, rol)
            self.assertEqual('reportes' in claves, rol in ROLES_LECTURA_REPORTES, rol)
            self.assertEqual('proveedores' in claves, rol in ROLES_LECTURA_PROVEEDORES, rol)
            self.assertEqual('usuarios' in claves, rol in ROLES_GESTION_USUARIOS, rol)
            self.assertEqual('dashboard' in claves, rol in ('administrador', 'directivo'), rol)
            # Módulos abiertos a todos los roles.
            self.assertTrue({'inicio', 'triny', 'ajustes', 'ayuda'} <= claves, rol)

    def test_ningun_rol_pierde_modulos_respecto_al_listado_previo(self):
        # Listado de módulos por rol ANTES de abrir Reportes y Proveedores a más roles: solo se pueden añadir accesos.
        previo = {
            'administrador': 'inicio dashboard triny administrador inventario usuarios compras reportes capacitacion documentos soporte recursos proveedores ajustes ayuda',
            'directivo': 'inicio dashboard triny inventario compras reportes capacitacion documentos soporte recursos proveedores ajustes ayuda',
            'supervisor': 'inicio triny inventario compras capacitacion documentos soporte recursos proveedores ajustes ayuda',
            'empleado': 'inicio triny inventario compras capacitacion documentos soporte recursos ajustes ayuda',
            'recursos_humanos': 'inicio triny inventario usuarios capacitacion documentos soporte recursos proveedores ajustes ayuda',
            'encargado_formacion': 'inicio triny inventario capacitacion documentos soporte recursos ajustes ayuda',
            'encargado_documental': 'inicio triny inventario capacitacion documentos soporte recursos ajustes ayuda',
            'capacitador': 'inicio triny inventario capacitacion documentos soporte recursos ajustes ayuda',
            'tecnico_soporte': 'inicio triny inventario capacitacion documentos soporte recursos ajustes ayuda',
            'encargado_administrativo': 'inicio triny inventario compras capacitacion documentos soporte recursos proveedores ajustes ayuda',
            'proveedor_contenido': 'inicio triny inventario capacitacion documentos soporte recursos ajustes ayuda',
        }
        self.assertEqual(set(previo), TODOS)
        for rol, texto in previo.items():
            self.assertLessEqual(set(texto.split()), self.claves(rol), rol)

    def test_accesos_nuevos_de_reportes_y_proveedores(self):
        con_reportes = {rol for rol in TODOS_LOS_ROLES if 'reportes' in self.claves(rol)}
        self.assertEqual(con_reportes, {'administrador', 'directivo', 'supervisor', 'recursos_humanos', 'encargado_documental'})
        con_proveedores = {rol for rol in TODOS_LOS_ROLES if 'proveedores' in self.claves(rol)}
        self.assertEqual(con_proveedores, {'administrador', 'directivo', 'supervisor', 'recursos_humanos',
                                           'encargado_administrativo', 'encargado_formacion'})

    def test_dashboard_y_resumen_siguen_siendo_de_administrador_y_directivo(self):
        for rol in TODOS_LOS_ROLES:
            self.assertEqual('dashboard' in self.claves(rol), rol in ('administrador', 'directivo'), rol)
        for rol in ('supervisor', 'recursos_humanos', 'encargado_documental', 'encargado_formacion'):
            self.assertNotIn('resumen_indicadores', [t.clave for t in tarjetas_para(rol)], rol)

    def test_perfil_no_va_en_el_menu(self):
        self.assertNotIn('perfil', self.claves('administrador'))

    def test_los_11_roles_estan_representados(self):
        self.assertEqual(set(TODOS_LOS_ROLES), TODOS)
        self.assertEqual(set(ROL_MODELOS_PERFIL), TODOS)

    def test_el_directivo_ve_solicitudes_por_aprobar_porque_aprueba_compras(self):
        self.assertIn('solicitudes_por_aprobar', [t.clave for t in tarjetas_para('directivo')])
        self.assertNotIn('solicitudes_por_aprobar', [t.clave for t in tarjetas_para('empleado')])

    def test_cada_tarjeta_exige_acceso_al_modulo_de_origen(self):
        # Solo el administrador ve la actividad reciente; el directivo, el resumen pero no la actividad.
        self.assertIn('actividad_reciente', [t.clave for t in tarjetas_para('administrador')])
        self.assertNotIn('actividad_reciente', [t.clave for t in tarjetas_para('directivo')])
        self.assertEqual([t.clave for t in tarjetas_para('proveedor_contenido')], ['acceso_triny', 'mis_tickets'])


class InicioApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        sistema = SistemaTrainet.objects.create(version='1.0', fecha_instalacion=timezone.localdate())
        ModuloAdministracion.objects.create(fo_sistema=sistema)
        cls.soporte = ModuloSoporteTecnico.objects.create(fo_sistema=sistema)
        cls.categoria = CategoriaTicket.objects.create(nombre_categoria='Hardware')
        cls.modulo_compras = ModuloComprasInternas.objects.create(fo_sistema=sistema)

        cls.supervisor_u = crear_usuario('supervisor')
        cls.supervisor = Supervisor.objects.create(fo_usuario=cls.supervisor_u)
        cls.ana_u = crear_usuario('empleado', 'ana@prueba.test')
        cls.luis_u = crear_usuario('empleado', 'luis@prueba.test')
        cls.ana = Empleado.objects.create(fo_usuario=cls.ana_u, puesto='A', fecha_ingreso=timezone.localdate(), fo_supervisor=cls.supervisor)
        cls.luis = Empleado.objects.create(fo_usuario=cls.luis_u, puesto='B', fecha_ingreso=timezone.localdate(), fo_supervisor=cls.supervisor)

        for usuario, texto in ((cls.ana_u, 'Ticket de Ana'), (cls.luis_u, 'Ticket de Luis')):
            TicketSoporte.objects.create(descripcion=texto, fo_categoria_ticket=cls.categoria, fo_usuario=usuario, fo_mod_soporte=cls.soporte)
            SolicitudCompra.objects.create(area=f'Área de {texto}', fo_solicitante=usuario, fo_mod_compras=cls.modulo_compras)

    def cliente(self, usuario):
        cliente = APIClient()
        cliente.force_authenticate(usuario)
        return cliente

    def tarjetas(self, usuario):
        return {t['clave']: t for t in self.cliente(usuario).get('/api/inicio/').data['tarjetas']}

    def test_sin_token_401(self):
        self.assertEqual(APIClient().get('/api/inicio/').status_code, 401)

    def test_solo_lectura_405(self):
        cliente = self.cliente(self.ana_u)
        for metodo in (cliente.post, cliente.put, cliente.patch, cliente.delete):
            self.assertEqual(metodo('/api/inicio/', {}, format='json').status_code, 405)

    def test_estructura_basica(self):
        datos = self.cliente(self.ana_u).get('/api/inicio/').data
        self.assertEqual(set(datos), {'usuario', 'nombre_equipo', 'modulos', 'tarjetas'})
        self.assertEqual(datos['usuario']['rol'], 'empleado')
        self.assertEqual(datos['usuario']['rol_nombre'], 'Empleado')
        self.assertEqual(datos['tarjetas'][0]['tipo'], 'acceso_triny')

    def test_un_empleado_no_ve_datos_de_otro(self):
        tarjetas = self.tarjetas(self.ana_u)
        titulos_tickets = [i['titulo'] for i in tarjetas['mis_tickets']['items']]
        self.assertEqual(titulos_tickets, ['Ticket de Ana'])
        self.assertEqual(tarjetas['mis_tickets']['total'], 1)
        subtitulos_pedidos = [i['subtitulo'] for i in tarjetas['mis_pedidos']['items']]
        self.assertTrue(all('Luis' not in s for s in subtitulos_pedidos))
        self.assertEqual(tarjetas['mis_pedidos']['total'], 1)

    def test_respuesta_sin_datos_personales(self):
        texto = str(self.cliente(self.ana_u).get('/api/inicio/').data)
        for prohibido in ('cedula', 'telefono', 'password'):
            self.assertNotIn(prohibido, texto)

    def test_el_supervisor_ve_los_pendientes_de_su_equipo_y_nada_mas(self):
        metricas = {m['etiqueta']: m['valor'] for m in self.tarjetas(self.supervisor_u)['pendientes_equipo']['metricas']}
        self.assertEqual(metricas['Empleados a cargo'], 2)
        self.assertEqual(metricas['Compras pendientes'], 2)
        # Un supervisor sin equipo ve ceros, no los datos de otro supervisor.
        otro = crear_usuario('supervisor', 'otro@prueba.test')
        Supervisor.objects.create(fo_usuario=otro)
        metricas_otro = {m['etiqueta']: m['valor'] for m in self.tarjetas(otro)['pendientes_equipo']['metricas']}
        self.assertEqual(metricas_otro['Empleados a cargo'], 0)
        self.assertEqual(metricas_otro['Compras pendientes'], 0)

    def test_mi_capacitacion_solo_con_inscripcion_vigente(self):
        self.assertNotIn('mi_capacitacion', self.tarjetas(self.ana_u))
        hoy = timezone.localdate()
        modulo = ModuloCapacitacion.objects.create(fo_sistema=SistemaTrainet.objects.first())
        curso = Curso.objects.create(titulo='Seguridad', descripcion='d', estado='activo', fo_mod_cap=modulo,
                                     fo_categoria_curso=CategoriaCurso.objects.create(nombre_categoria='Seg'))
        instructor = Capacitador.objects.create(fo_usuario=crear_usuario('capacitador'), especialidad_tecnica='x')
        capacitacion = Capacitacion.objects.create(fecha_inicio=hoy - timedelta(days=1), fecha_fin=hoy + timedelta(days=5),
                                                   modalidad='Virtual', fo_instructor=instructor, fo_mod_cap=modulo, fo_curso=curso)
        ParticipanteCapacitacion.objects.create(fo_capacitacion=capacitacion, fo_empleado=self.ana)
        ProgresoCurso.objects.create(fo_empleado=self.ana, fo_curso=curso, porcentaje=40)
        tarjeta = self.tarjetas(self.ana_u)['mi_capacitacion']
        self.assertEqual(tarjeta['tipo'], 'progreso')
        self.assertEqual((tarjeta['item']['titulo'], tarjeta['item']['porcentaje'], tarjeta['item']['estado']), ('Seguridad', 40, 'En curso'))
        # Luis no está inscrito: no ve la capacitación de Ana.
        self.assertNotIn('mi_capacitacion', self.tarjetas(self.luis_u))

    def test_proveedor_de_contenido_solo_ve_las_tarjetas_comunes(self):
        proveedor = crear_usuario('proveedor_contenido')
        self.assertEqual(list(self.tarjetas(proveedor)), ['acceso_triny', 'mis_tickets'])
