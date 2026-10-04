"""Proveedores: el directorio es igual para todos los roles con acceso al módulo.

Se busca por razón social y especialidad. NO por RUT/NIT, contacto, correo ni teléfono.
"""
from django.db.models import Q

from notificaciones.rutas import VISTA_PROVEEDORES_DIRECTORIO
from proveedores.models import Proveedor

from ..estructuras import Resultado


def buscar(usuario, texto, limite):
    proveedores = (Proveedor.objects
                   .filter(Q(razon_social__icontains=texto) | Q(especialidad__icontains=texto))
                   .order_by('razon_social', 'id')
                   .only('razon_social', 'especialidad', 'estado')[:limite])
    return [Resultado(p.razon_social, p.especialidad, p.get_estado_display(), VISTA_PROVEEDORES_DIRECTORIO)
            for p in proveedores]
