"""Tarjetas de atención de tickets (técnico de soporte y administrador)."""
from django.db.models import Count, Q

from soporte.views import tickets_visibles

from ..estructuras import MAX_ITEMS_LISTA, item_lista, metrica, tarjeta_lista, tarjeta_metricas

ESTADOS_CERRADOS = ('resuelto', 'cerrado')


def tickets_sin_atender(usuario):
    """Tickets en estado inicial (abierto) o en proceso pero sin técnico, dentro de los que el rol puede ver
    (técnico: los suyos y los sin asignar; administrador: todos)."""
    sin_atender = tickets_visibles(usuario).filter(Q(estado='abierto') | Q(estado='en_proceso', fo_tecnico__isnull=True))
    recientes = sin_atender.select_related('fo_categoria_ticket', 'fo_usuario').order_by('-id')[:MAX_ITEMS_LISTA]
    items = [
        item_lista(t.descripcion[:80],
                   f'{t.fo_categoria_ticket.nombre_categoria} · prioridad {t.get_prioridad_display().lower()} · {t.fo_usuario.nombre}',
                   t.get_estado_display(), '/soporte')
        for t in recientes
    ]
    return tarjeta_lista('tickets_sin_atender', 'Tickets sin atender', items, sin_atender.count(), '/soporte')


def tickets_estado(usuario):
    """Resumen numérico de los tickets visibles para el rol (una sola consulta)."""
    datos = tickets_visibles(usuario).aggregate(
        sin_asignar=Count('id', filter=Q(fo_tecnico__isnull=True) & ~Q(estado__in=ESTADOS_CERRADOS)),
        abiertos=Count('id', filter=Q(estado='abierto')),
        en_proceso=Count('id', filter=Q(estado='en_proceso')),
    )
    return tarjeta_metricas('tickets_estado', 'Estado de los tickets', [
        metrica('Sin asignar', datos['sin_asignar'], '/soporte'),
        metrica('Abiertos', datos['abiertos'], '/soporte'),
        metrica('En proceso', datos['en_proceso'], '/soporte'),
    ])
