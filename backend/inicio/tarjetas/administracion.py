"""Tarjetas gerenciales: actividad del sistema e indicadores clave."""
from datetime import timedelta

from django.core.cache import cache
from django.utils import timezone

from administracion.auditoria import ACCIONES, MODULOS
from administracion.models import LogAuditoria
from reportes.generadores import general

from ..estructuras import MAX_ITEMS_LISTA, item_lista, metrica, tarjeta_lista, tarjeta_metricas

DIAS_RESUMEN = 30
SEGUNDOS_CACHE_RESUMEN = 60
MAX_INDICADORES = 4


def actividad_reciente(usuario):
    """Últimos eventos de la bitácora. Solo acción, usuario, módulo y hora: sin descripciones ni IP (datos sensibles)."""
    eventos = LogAuditoria.objects.select_related('fo_usuario')
    recientes = eventos.order_by('-fecha_hora', '-id')[:MAX_ITEMS_LISTA]
    items = [
        item_lista(
            ACCIONES.get(e.accion, 'Evento del sistema'),
            f"{e.fo_usuario.nombre if e.fo_usuario else 'Sin usuario'} · {timezone.localtime(e.fecha_hora):%d/%m/%Y %H:%M}",
            MODULOS.get(e.modulo, e.modulo), '/administrador')
        for e in recientes
    ]
    return tarjeta_lista('actividad_reciente', 'Actividad reciente', items, eventos.count(), '/administrador')


def resumen_indicadores(usuario):
    """Primeros indicadores del consolidado general de los últimos 30 días (con caché corta: el consolidado
    ejecuta las consultas de todos los módulos)."""
    hoy = timezone.localdate()
    desde = hoy - timedelta(days=DIAS_RESUMEN - 1)
    clave_cache = f'inicio:resumen:{hoy.isoformat()}'
    indicadores = cache.get(clave_cache)
    if indicadores is None:
        indicadores = general.generar(desde, hoy)['indicadores'][:MAX_INDICADORES]
        cache.set(clave_cache, indicadores, SEGUNDOS_CACHE_RESUMEN)
    return tarjeta_metricas('resumen_indicadores', f'Resumen de indicadores (últimos {DIAS_RESUMEN} días)',
                            [metrica(i['etiqueta'], i['valor']) for i in indicadores], '/dashboard')
