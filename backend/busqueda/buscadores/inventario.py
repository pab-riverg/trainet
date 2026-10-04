"""Inventario de contenido: la lista es igual para todos los roles. Se busca por nombre y categoría."""
from django.db.models import Q

from inventario.models import Contenido

from ..estructuras import Resultado


def buscar(usuario, texto, limite):
    contenidos = (Contenido.objects
                  .filter(Q(nombre_contenido__icontains=texto) | Q(fo_categoria_cont__nombre_categoria__icontains=texto))
                  .order_by('-fecha_actualizacion', '-id')
                  .select_related('fo_categoria_cont', 'fo_estado_cont')
                  .only('nombre_contenido', 'tipo_contenido', 'fo_categoria_cont__nombre_categoria',
                        'fo_estado_cont__nombre_estado')[:limite])
    return [Resultado(c.nombre_contenido, f'{c.get_tipo_contenido_display()} · {c.fo_categoria_cont.nombre_categoria}',
                      c.fo_estado_cont.nombre_estado) for c in contenidos]
