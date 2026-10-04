"""Compras: solicitudes con el mismo alcance que la lista (solicitudes_visibles) y artículos del catálogo con el de
articulos_visibles. Solo se devuelven artículos a quien tiene pestaña de Tienda o de Catálogo (el directivo no).
Se busca por área, nota, artículo y categoría; no por montos ni motivos de decisión."""
from django.db.models import Q

from compras.permisos import ROLES_GESTION_COMPRAS, ROLES_SOLICITUD_COMPRAS, ROLES_VER_TODAS_SOLICITUDES
from compras.views import articulos_visibles, solicitudes_visibles
from notificaciones.rutas import (
    VISTA_COMPRAS_CATALOGO, VISTA_COMPRAS_MIS_SOLICITUDES, VISTA_COMPRAS_SOLICITUDES, VISTA_COMPRAS_TIENDA)

from ..estructuras import Resultado, recortar


def buscar(usuario, texto, limite):
    ve_todas = usuario.rol in ROLES_VER_TODAS_SOLICITUDES
    filtro = Q(area__icontains=texto) | Q(nota__icontains=texto) | Q(items__fo_articulo__nombre__icontains=texto)
    if ve_todas:
        filtro |= Q(fo_solicitante__nombre__icontains=texto)
    # distinct(): la búsqueda por artículo une con los ítems y podría repetir la solicitud.
    solicitudes = (solicitudes_visibles(usuario).filter(filtro).distinct().order_by('-id')
                   .select_related('fo_solicitante')
                   .only('area', 'estado', 'fecha_solicitud', 'fo_solicitante__nombre')[:limite])
    vista = VISTA_COMPRAS_SOLICITUDES if ve_todas else VISTA_COMPRAS_MIS_SOLICITUDES
    resultados = [Resultado('Solicitud · ' + recortar(s.area),
                            f'{s.fecha_solicitud:%d/%m/%Y}' + (f' · {s.fo_solicitante.nombre}' if ve_todas else ''),
                            s.get_estado_display(), vista) for s in solicitudes]

    vista_articulos = (VISTA_COMPRAS_TIENDA if usuario.rol in ROLES_SOLICITUD_COMPRAS
                       else VISTA_COMPRAS_CATALOGO if usuario.rol in ROLES_GESTION_COMPRAS else None)
    if vista_articulos and len(resultados) < limite:
        articulos = (articulos_visibles(usuario)
                     .filter(Q(nombre__icontains=texto) | Q(descripcion__icontains=texto)
                             | Q(fo_categoria__nombre__icontains=texto))
                     .order_by('nombre', 'id').select_related('fo_categoria')
                     .only('nombre', 'disponible', 'fo_categoria__nombre')[:limite - len(resultados)])
        resultados += [Resultado(a.nombre, 'Artículo · ' + a.fo_categoria.nombre,
                                 'Disponible' if a.disponible else 'No disponible', vista_articulos)
                       for a in articulos]
    return resultados
