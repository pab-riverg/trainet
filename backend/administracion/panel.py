"""Datos del panel de administración: resumen real por requisito (los módulos de origen se gestionan en su propia pantalla)."""
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from capacitacion.models import Capacitacion, ParticipanteCapacitacion
from documentos.models import Documento
from reportes.models import ArchivoImportado, Reporte
from usuarios.models import Empleado, Usuario

from . import configuracion
from .models import DocumentoInstitucional, SistemaTrainet

DIAS_INFORMES = 30


def _indicadores(*pares):
    return [{'etiqueta': etiqueta, 'valor': valor} for etiqueta, valor in pares]


def _porcentaje(parte, total):
    return round(parte * 100 / total, 1) if total else 0


def requisito_empleados():
    # El perfil de empleado exige puesto, fecha de ingreso y supervisor, así que "sin perfil" es lo que se mide.
    perfiles = Empleado.objects.aggregate(
        total=Count('id'),
        completos=Count('id', filter=~Q(puesto='') & Q(fecha_ingreso__isnull=False)),
        con_supervisor=Count('id', filter=Q(fo_supervisor__isnull=False)),
    )
    usuarios_empleado = Usuario.objects.filter(rol='empleado', is_active=True)
    sin_perfil = usuarios_empleado.filter(empleado__isnull=True).count()
    return {
        'clave': 'empleados',
        'titulo': 'Registro de empleados',
        'descripcion': 'Información de los empleados registrados en la plataforma.',
        'indicadores': _indicadores(
            ('Usuarios activos', Usuario.objects.filter(is_active=True).count()),
            ('Usuarios con cédula registrada', Usuario.objects.filter(cedula__isnull=False).count()),
            ('Empleados con perfil', perfiles['total']),
            ('Perfiles completos (puesto y fecha de ingreso)', perfiles['completos']),
            ('Empleados con supervisor asignado', perfiles['con_supervisor']),
            ('Empleados activos sin perfil', sin_perfil),
        ),
    }


def requisito_capacitacion():
    participantes = ParticipanteCapacitacion.objects.aggregate(
        inscritos=Count('id'), asistieron=Count('id', filter=Q(asistio=True)))
    return {
        'clave': 'capacitacion',
        'titulo': 'Participación en capacitaciones',
        'descripcion': 'Seguimiento de la asistencia a las capacitaciones.',
        'indicadores': _indicadores(
            ('Capacitaciones registradas', Capacitacion.objects.count()),
            ('Inscritos', participantes['inscritos']),
            ('% de asistencia', _porcentaje(participantes['asistieron'], participantes['inscritos'])),
        ),
    }


def requisito_documentos():
    return {
        'clave': 'documentos',
        'titulo': 'Documentos institucionales',
        'descripcion': 'Documentos de la organización y biblioteca documental.',
        'indicadores': _indicadores(
            ('Documentos institucionales', DocumentoInstitucional.objects.count()),
            ('Documentos en la biblioteca', Documento.objects.count()),
        ),
    }


def requisito_reportes():
    desde = timezone.localdate() - timedelta(days=DIAS_INFORMES - 1)
    return {
        'clave': 'reportes',
        'titulo': 'Informes de gestión',
        'descripcion': 'Informes generados y archivos disponibles para consolidar.',
        'indicadores': _indicadores(
            (f'Informes generados en los últimos {DIAS_INFORMES} días', Reporte.objects.filter(fecha_generacion__gte=desde).count()),
            ('Archivos importados activos', ArchivoImportado.objects.filter(activo=True).count()),
        ),
    }


def datos_panel():
    sistema = SistemaTrainet.objects.order_by('id').first()
    return {
        'sistema': {
            'version': sistema.version if sistema else None,
            'fecha_instalacion': sistema.fecha_instalacion.isoformat() if sistema else None,
            'nombre_equipo': configuracion.obtener('nombre_equipo'),
            'usuarios_activos': Usuario.objects.filter(is_active=True).count(),
        },
        'requisitos': [requisito_empleados(), requisito_capacitacion(), requisito_documentos(), requisito_reportes()],
    }
