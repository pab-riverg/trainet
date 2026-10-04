from datetime import date

from decouple import config
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from administracion import configuracion
from administracion.models import ModuloActivo, SistemaTrainet
from asistente.models import CategoriaAsistente, ConsultaFrecuente, ModuloAsistenteVirtual
from asistente.semilla import (
    CATEGORIA_POR_PREGUNTA, CATEGORIAS_ASISTENTE, PALABRAS_CLAVE_EXTRA, PREGUNTAS_ASISTENTE, fusionar_palabras_clave,
)
from capacitacion.models import CategoriaCurso, ModuloCapacitacion
from compras.models import Articulo, CategoriaArticulo, ModuloComprasInternas
from documentos.models import CategoriaDocumento, ModuloGestionDocumental, TipoDocumento
from inventario.models import CategoriaContenido, EstadoContenido, ModuloInventarioContenido
from proveedores.models import ModuloGestionProveedores
from recursos.models import ModuloPedidoRecursos, TipoRecurso
from reportes.models import FrecuenciaReporte, ModuloReportes, TipoReporte
from soporte.models import CategoriaTicket, ModuloSoporteTecnico
from administracion.models import ModuloAdministracion


class Command(BaseCommand):
    help = 'Carga los datos base de TRAINET (sistema, módulos y catálogos). Es idempotente.'

    def _registrar(self, etiqueta, nombre, creado):
        if creado:
            self.creados += 1
            self.stdout.write(self.style.SUCCESS(f'[creado] {etiqueta}: {nombre}'))
        else:
            self.existentes += 1
            self.stdout.write(f'[ya existía] {etiqueta}: {nombre}')

    def _obtener(self, modelo, etiqueta, nombre, **kwargs):
        obj, creado = modelo.objects.get_or_create(**kwargs)
        self._registrar(etiqueta, nombre, creado)
        return obj

    def _sembrar_catalogo_compras(self, modulo_compras):
        categorias = {}
        for nombre, icono in [
            ('Software y licencias', 'bi-key'),
            ('Equipos y tecnología', 'bi-laptop'),
            ('Insumos de oficina', 'bi-paperclip'),
            ('Mobiliario', 'bi-house-door'),
            ('Material de formación', 'bi-book'),
            ('Servicios', 'bi-tools'),
            ('Otros', 'bi-box-seam'),
        ]:
            categoria, creada = CategoriaArticulo.objects.get_or_create(nombre=nombre, defaults={'icono': icono})
            categorias[nombre] = categoria
            self._registrar('Categoría de artículo', nombre, creada)

        # Datos de demostración (precios de referencia en pesos colombianos).
        for nombre, categoria, precio, disponible in [
            ('Licencia Microsoft 365 (usuario/año)', 'Software y licencias', 450000, True),
            ('Antivirus corporativo (licencia anual)', 'Software y licencias', 120000, True),
            ('Portátil 14" 16 GB RAM', 'Equipos y tecnología', 3200000, True),
            ('Monitor 24 pulgadas', 'Equipos y tecnología', 650000, True),
            ('Resma de papel carta (500 hojas)', 'Insumos de oficina', 18000, True),
            ('Silla ergonómica de oficina', 'Mobiliario', 520000, True),
            ('Kit de material para talleres', 'Material de formación', 85000, True),
            ('Mantenimiento de equipos (por equipo)', 'Servicios', 150000, False),
        ]:
            _, creado = Articulo.objects.get_or_create(
                nombre=nombre,
                fo_categoria=categorias[categoria],
                fo_mod_compras=modulo_compras,
                defaults={'precio_referencia': precio, 'disponible': disponible},
            )
            self._registrar('Artículo', nombre, creado)

    def _sembrar_asistente(self, modulo_asistente):
        categorias = {}
        for orden, (nombre, icono) in enumerate(CATEGORIAS_ASISTENTE, start=1):
            categoria, creada = CategoriaAsistente.objects.get_or_create(
                nombre=nombre,
                defaults={'icono': icono, 'orden': orden, 'fo_mod_asistente': modulo_asistente},
            )
            categorias[nombre] = categoria
            self._registrar('Categoría del asistente', nombre, creada)

        for categoria, pregunta, palabras_clave, respuesta in PREGUNTAS_ASISTENTE:
            palabras_clave = fusionar_palabras_clave(palabras_clave, PALABRAS_CLAVE_EXTRA.get(pregunta, ''))
            consulta, creada = ConsultaFrecuente.objects.get_or_create(
                pregunta=pregunta,
                defaults={'respuesta': respuesta, 'palabras_clave': palabras_clave,
                          'fo_categoria': categorias[categoria], 'fo_mod_asistente': modulo_asistente},
            )
            if creada:
                self._registrar('Pregunta frecuente', pregunta, True)
                continue
            # Fila existente: solo fusiona palabras clave y completa la categoría vacía.
            cambios = []
            fusionadas = fusionar_palabras_clave(consulta.palabras_clave, palabras_clave)
            if fusionadas != consulta.palabras_clave:
                consulta.palabras_clave = fusionadas
                cambios.append('palabras_clave')
            nombre_categoria = CATEGORIA_POR_PREGUNTA.get(pregunta)
            if consulta.fo_categoria_id is None and nombre_categoria:
                consulta.fo_categoria = categorias[nombre_categoria]
                cambios.append('fo_categoria')
            if cambios:
                consulta.save(update_fields=cambios)
                self.actualizados += 1
                self.stdout.write(self.style.SUCCESS(f'[actualizado] Pregunta frecuente: {pregunta} ({", ".join(cambios)})'))
            else:
                self._registrar('Pregunta frecuente', pregunta, False)

    def _sembrar_usuarios_de_prueba(self, clave):
        """Garantiza al menos un usuario por rol (con su perfil) para poder probar cada Inicio. No toca los existentes."""
        from usuarios.models import Supervisor, Usuario
        from usuarios.perfiles import crear_perfil, validar_perfil

        supervisor_demo = None
        # El supervisor va antes que el empleado, que necesita uno.
        orden = ['supervisor'] + [codigo for codigo, _ in Usuario.ROL_CHOICES if codigo != 'supervisor']
        for rol in orden:
            if Usuario.objects.filter(rol=rol).exists():
                self._registrar('Usuario de prueba', rol, False)
                continue
            usuario = Usuario(email=f'{rol}@trainet.com', nombre=rol.replace('_', ' ').capitalize(), rol=rol,
                              is_staff=(rol == 'administrador'))
            usuario.set_password(clave)
            usuario.save()
            datos = {'puesto': 'Auxiliar', 'fo_supervisor': Supervisor.objects.first().pk} if rol == 'empleado' else {}
            datos = {'departamento': 'Recursos Humanos'} if rol == 'recursos_humanos' else datos
            datos = {'especialidad_tecnica': 'General'} if rol in ('capacitador', 'tecnico_soporte') else datos
            crear_perfil(usuario, validar_perfil(rol, datos))
            self._registrar('Usuario de prueba', f'{rol} ({usuario.email})', True)

    def add_arguments(self, parser):
        parser.add_argument('--password', help='Contraseña de los usuarios de prueba (tiene prioridad sobre TRAINET_SEED_PASSWORD).')

    def handle(self, *args, **options):
        # La contraseña no está escrita en el código: se valida antes de escribir cualquier dato.
        clave = options.get('password') or config('TRAINET_SEED_PASSWORD', default='')
        if not clave:
            raise CommandError(
                'Falta la contraseña de los usuarios de prueba. Defínela en backend/.env como TRAINET_SEED_PASSWORD=... '
                'o pásala con --password. No se escribió ningún dato.'
            )
        self._ejecutar(clave)

    @transaction.atomic
    def _ejecutar(self, clave):
        self.creados = 0
        self.existentes = 0
        self.actualizados = 0

        # Sistema
        sistema = SistemaTrainet.objects.order_by('id').first()
        if sistema:
            self._registrar('Sistema', f'versión {sistema.version}', False)
        else:
            sistema = SistemaTrainet.objects.create(version='1.0', fecha_instalacion=date.today())
            self._registrar('Sistema', 'versión 1.0', True)

        # Módulos (una fila por módulo)
        modulos = {}
        for modelo in [
            ModuloAdministracion, ModuloCapacitacion, ModuloGestionDocumental,
            ModuloSoporteTecnico, ModuloInventarioContenido, ModuloPedidoRecursos,
            ModuloGestionProveedores, ModuloComprasInternas, ModuloAsistenteVirtual,
            ModuloReportes,
        ]:
            modulos[modelo] = self._obtener(modelo, 'Módulo', modelo.__name__, fo_sistema=sistema)

        for nombre in [
            'Usuarios', 'Administración', 'Capacitación', 'Gestión Documental',
            'Soporte Técnico', 'Inventario de Contenido', 'Pedidos de Recursos',
            'Gestión de Proveedores', 'Compras Internas', 'Asistente Virtual',
            'Reportes y Análisis',
        ]:
            self._obtener(ModuloActivo, 'Módulo activo', nombre, nombre_modulo=nombre, fo_sistema=sistema)

        mod_doc = modulos[ModuloGestionDocumental]
        mod_rep = modulos[ModuloReportes]

        catalogos = [
            (TipoDocumento, 'Tipo de documento', 'nombre_tipo', {},
             ['Política', 'Procedimiento', 'Manual', 'Formato', 'Contrato', 'Informe']),
            (CategoriaDocumento, 'Categoría de documento', 'nombre_categoria', {'fo_mod_doc': mod_doc},
             ['Recursos Humanos', 'Administrativo', 'Formación', 'Legal', 'Tecnología']),
            (CategoriaContenido, 'Categoría de contenido', 'nombre_categoria', {},
             ['Inducción', 'Capacitación técnica', 'Seguridad', 'Habilidades blandas', 'Normativa']),
            (EstadoContenido, 'Estado de contenido', 'nombre_estado', {},
             ['Borrador', 'En revisión', 'Publicado', 'Archivado']),
            (CategoriaTicket, 'Categoría de ticket', 'nombre_categoria', {},
             ['Acceso y contraseñas', 'Hardware', 'Software', 'Red y conectividad',
              'Error del sistema', 'Otro']),
            (TipoRecurso, 'Tipo de recurso', 'nombre_tipo', {},
             ['Material de oficina', 'Equipo tecnológico', 'Licencia de software',
              'Material de capacitación', 'Mobiliario']),
            (TipoReporte, 'Tipo de reporte', 'nombre_tipo', {'fo_mod_reportes': mod_rep},
             ['Asistencia a capacitaciones', 'Documentos', 'Tickets de soporte',
              'Pedidos de recursos', 'Compras', 'Consolidado general']),
            (FrecuenciaReporte, 'Frecuencia de reporte', 'descripcion', {'fo_mod_reportes': mod_rep},
             ['Diario', 'Semanal', 'Mensual', 'Trimestral', 'Bajo demanda']),
            (CategoriaCurso, 'Categoría de curso', 'nombre_categoria', {},
             ['Tecnología', 'Seguridad', 'Habilidades blandas', 'Normativa']),
        ]

        for modelo, etiqueta, campo, extra, nombres in catalogos:
            for nombre in nombres:
                kwargs = {campo: nombre, **extra}
                if modelo is TipoRecurso:
                    obj, creado = modelo.objects.get_or_create(**kwargs, defaults={'disponible': True})
                    self._registrar(etiqueta, nombre, creado)
                else:
                    self._obtener(modelo, etiqueta, nombre, **kwargs)

        for nombre in ['Ventas', 'Asistencia', 'Inventario', 'Finanzas', 'Recursos Humanos', 'Otros']:
            _, creado = TipoReporte.objects.get_or_create(
                nombre_tipo=nombre, fo_mod_reportes=mod_rep, defaults={'origen': 'archivo'})
            self._registrar('Tipo de archivo importado', nombre, creado)


        # Tipos de informe de sistema: cada clave se asocia a un tipo existente por nombre o se crea.
        for clave, nombre_existente, nombre_nuevo in [
            ('soporte', 'Tickets de soporte', 'Tickets de soporte'),
            ('recursos', 'Pedidos de recursos', 'Pedidos de recursos'),
            ('compras', 'Compras', 'Compras'),
            ('capacitacion', 'Asistencia a capacitaciones', 'Capacitación'),
            ('proveedores', None, 'Proveedores'),
            ('asistente', None, 'Asistente virtual'),
            ('general', 'Consolidado general', 'Resumen general'),
            ('consolidado', None, 'Consolidado de archivos'),
        ]:
            if TipoReporte.objects.filter(clave=clave).exists():
                self._registrar('Clave de informe', clave, False)
                continue
            tipo = TipoReporte.objects.filter(
                nombre_tipo=nombre_existente, origen='sistema', clave__isnull=True).first() if nombre_existente else None
            if tipo:
                tipo.clave = clave
                tipo.save(update_fields=['clave'])
                self._registrar('Clave de informe (tipo existente)', f'{clave} -> {tipo.nombre_tipo}', True)
            else:
                TipoReporte.objects.get_or_create(
                    nombre_tipo=nombre_nuevo, fo_mod_reportes=mod_rep, defaults={'origen': 'sistema', 'clave': clave})
                self._registrar('Tipo de informe', f'{clave} -> {nombre_nuevo}', True)

        for clave, creada in configuracion.sembrar_por_defecto():
            self._registrar('Configuración del sistema', clave, creada)

        self._sembrar_catalogo_compras(modulos[ModuloComprasInternas])
        self._sembrar_asistente(modulos[ModuloAsistenteVirtual])
        self._sembrar_usuarios_de_prueba(clave)

        self.stdout.write(self.style.SUCCESS(
            f'Resumen: {self.creados} creados, {self.actualizados} actualizados, {self.existentes} ya existían.'
        ))
