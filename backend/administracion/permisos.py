from rest_framework.permissions import IsAuthenticated

from usuarios.permissions import permiso_por_roles

# Única fuente de verdad de los roles del módulo de Administración. El frontend los replicará en
# frontend/src/app/modelos/permisos-administracion.ts y deben mantenerse iguales.
# Panel, bitácora y edición de la configuración. La lectura de la configuración pública (nombre del equipo)
# es para cualquier usuario autenticado.
ROLES_ADMINISTRACION = ('administrador',)


def permisos_administracion():
    return [IsAuthenticated(), permiso_por_roles(*ROLES_ADMINISTRACION)()]
