"""Documentos: la biblioteca es igual para todos los roles. Se busca por título y categoría."""
from django.db.models import Q

from documentos.models import Documento

from ..estructuras import Resultado


def buscar(usuario, texto, limite):
    documentos = (Documento.objects
                  .filter(Q(titulo__icontains=texto) | Q(fo_categoria_documento__nombre_categoria__icontains=texto))
                  .order_by('-fecha_creacion', '-id')
                  .select_related('fo_categoria_documento')
                  .only('titulo', 'version', 'fo_categoria_documento__nombre_categoria')[:limite])
    return [Resultado(d.titulo, f'{d.fo_categoria_documento.nombre_categoria} · v{d.version}') for d in documentos]
