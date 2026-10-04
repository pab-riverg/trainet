"""Soporte: mismo alcance que la lista de tickets (tickets_visibles): administrador todos; técnico los asignados a él
y los sin asignar; el resto, solo los suyos. Se busca por la descripción (asunto) y la categoría."""
from django.db.models import Q

from notificaciones.rutas import VISTA_SOPORTE_GESTION, VISTA_SOPORTE_MIS_TICKETS
from soporte.views import ROLES_GESTION_TICKETS, tickets_visibles

from ..estructuras import Resultado, recortar


def buscar(usuario, texto, limite):
    tickets = (tickets_visibles(usuario)
               .filter(Q(descripcion__icontains=texto) | Q(fo_categoria_ticket__nombre_categoria__icontains=texto))
               .order_by('-id')
               .select_related('fo_categoria_ticket')
               .only('descripcion', 'estado', 'fo_categoria_ticket__nombre_categoria')[:limite])
    vista = VISTA_SOPORTE_GESTION if usuario.rol in ROLES_GESTION_TICKETS else VISTA_SOPORTE_MIS_TICKETS
    return [Resultado(recortar(t.descripcion), t.fo_categoria_ticket.nombre_categoria, t.get_estado_display(), vista)
            for t in tickets]
