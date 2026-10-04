"""Usuarios: solo lo ven quienes gestionan usuarios (el registro de módulos lo decide).

Se busca por nombre, correo y puesto. Nunca por cédula, teléfono ni contraseña, y esos datos no se devuelven.
"""
from django.db.models import Q

from usuarios.models import Usuario

from ..estructuras import Resultado

ETIQUETAS_ROL = dict(Usuario.ROL_CHOICES)


def buscar(usuario, texto, limite):
    filas = (Usuario.objects
             .filter(Q(nombre__icontains=texto) | Q(email__icontains=texto) | Q(empleado__puesto__icontains=texto))
             .order_by('nombre', 'id')
             .values('nombre', 'rol', 'is_active', 'empleado__puesto')[:limite])
    return [Resultado(f['nombre'], f['empleado__puesto'] or ETIQUETAS_ROL.get(f['rol'], f['rol']),
                      'Activo' if f['is_active'] else 'Inactivo')
            for f in filas]
