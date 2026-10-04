"""Recursos: pedidos con el mismo alcance que la lista (solicitudes_visibles: gestión todos, el resto los suyos) y,
solo para gestión (que tiene la pestaña Catálogo), los tipos de recurso. Se busca por justificación y recurso."""
from django.db.models import Q

from notificaciones.rutas import VISTA_RECURSOS_CATALOGO, VISTA_RECURSOS_GESTION, VISTA_RECURSOS_MIS_PEDIDOS
from recursos.models import TipoRecurso
from recursos.views import ROLES_GESTION_RECURSOS, solicitudes_visibles

from ..estructuras import Resultado, recortar


def buscar(usuario, texto, limite):
    gestiona = usuario.rol in ROLES_GESTION_RECURSOS
    filtro = Q(justificacion__icontains=texto) | Q(fo_tipo_recurso__nombre_tipo__icontains=texto)
    if gestiona:
        filtro |= Q(fo_usuario__nombre__icontains=texto)
    pedidos = (solicitudes_visibles(usuario).filter(filtro).order_by('-id')
               .select_related('fo_tipo_recurso', 'fo_usuario')
               .only('justificacion', 'estado', 'fo_tipo_recurso__nombre_tipo', 'fo_usuario__nombre')[:limite])
    vista = VISTA_RECURSOS_GESTION if gestiona else VISTA_RECURSOS_MIS_PEDIDOS
    resultados = [Resultado('Pedido · ' + p.fo_tipo_recurso.nombre_tipo,
                            recortar(p.justificacion) + (f' · {p.fo_usuario.nombre}' if gestiona else ''),
                            p.get_estado_display(), vista) for p in pedidos]
    if gestiona and len(resultados) < limite:
        tipos = (TipoRecurso.objects.filter(nombre_tipo__icontains=texto).order_by('nombre_tipo', 'id')
                 [:limite - len(resultados)])
        resultados += [Resultado(t.nombre_tipo, 'Catálogo de recursos',
                                 'Disponible' if t.disponible else 'No disponible', VISTA_RECURSOS_CATALOGO)
                       for t in tipos]
    return resultados
