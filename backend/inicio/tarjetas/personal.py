"""Tarjetas con información propia del usuario: solo ve lo suyo."""
from django.db.models import Count, OuterRef, Subquery
from django.utils import timezone

from capacitacion.models import ParticipanteCapacitacion, ProgresoCurso
from compras.models import SolicitudCompra
from recursos.models import SolicitudRecursos
from soporte.models import TicketSoporte

from ..estructuras import MAX_ITEMS_LISTA, item_lista, tarjeta_acceso_triny, tarjeta_lista, tarjeta_progreso

ESTADOS_TICKET_ABIERTO = ('abierto', 'en_proceso')


def acceso_triny(usuario):
    return tarjeta_acceso_triny()


def mis_tickets(usuario):
    """Tickets abiertos creados por el propio usuario."""
    tickets = TicketSoporte.objects.filter(fo_usuario=usuario, estado__in=ESTADOS_TICKET_ABIERTO)
    recientes = tickets.select_related('fo_categoria_ticket').order_by('-id')[:MAX_ITEMS_LISTA]
    items = [
        item_lista(t.descripcion[:80], f'{t.fo_categoria_ticket.nombre_categoria} · {t.fecha_creacion:%d/%m/%Y}',
                   t.get_estado_display(), '/soporte')
        for t in recientes
    ]
    return tarjeta_lista('mis_tickets', 'Mis tickets abiertos', items, tickets.count(), '/soporte')


def mi_capacitacion(usuario):
    """Inscripción vigente (la capacitación aún no termina) más reciente del empleado, con su avance en el curso.

    Solo los usuarios con perfil de empleado pueden inscribirse; sin inscripción activa no hay tarjeta.
    """
    hoy = timezone.localdate()
    avance = ProgresoCurso.objects.filter(
        fo_empleado=OuterRef('fo_empleado'), fo_curso=OuterRef('fo_capacitacion__fo_curso')
    ).values('porcentaje')[:1]
    inscripcion = (
        ParticipanteCapacitacion.objects
        .filter(fo_empleado__fo_usuario=usuario, fo_capacitacion__fecha_fin__gte=hoy)
        .select_related('fo_capacitacion__fo_curso')
        .annotate(porcentaje=Subquery(avance))
        .order_by('-fo_capacitacion__fecha_inicio', '-id')
        .first()
    )
    if inscripcion is None:
        return None
    capacitacion = inscripcion.fo_capacitacion
    estado = 'En curso' if capacitacion.fecha_inicio <= hoy else 'Próxima'
    subtitulo = f'{capacitacion.modalidad} · {capacitacion.fecha_inicio:%d/%m/%Y} al {capacitacion.fecha_fin:%d/%m/%Y}'
    return tarjeta_progreso('mi_capacitacion', 'Mi capacitación en curso', capacitacion.fo_curso.titulo, subtitulo,
                            inscripcion.porcentaje or 0, estado, '/capacitacion')


def mis_pedidos(usuario):
    """Últimos pedidos propios de compra y de recursos, mezclados por fecha, con su estado."""
    compras = SolicitudCompra.objects.filter(fo_solicitante=usuario)
    recursos = SolicitudRecursos.objects.filter(fo_usuario=usuario)

    registros = []
    for compra in compras.annotate(articulos=Count('items')).order_by('-id')[:MAX_ITEMS_LISTA]:
        registros.append((compra.fecha_solicitud, compra.id, item_lista(
            f'Solicitud de compra #{compra.id}', f'{compra.area} · {compra.articulos} artículo(s)',
            compra.get_estado_display(), '/compras')))
    for pedido in recursos.select_related('fo_tipo_recurso').order_by('-id')[:MAX_ITEMS_LISTA]:
        registros.append((pedido.fecha_solicitud, pedido.id, item_lista(
            f'Recurso: {pedido.fo_tipo_recurso.nombre_tipo}', f'{pedido.cantidad} unidad(es) · {pedido.fecha_solicitud:%d/%m/%Y}',
            pedido.get_estado_display(), '/recursos')))

    registros.sort(key=lambda r: (r[0], r[1]), reverse=True)
    items = [r[2] for r in registros]
    return tarjeta_lista('mis_pedidos', 'Mis pedidos', items, compras.count() + recursos.count())
