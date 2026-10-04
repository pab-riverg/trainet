from rest_framework.permissions import IsAuthenticated

from usuarios.permissions import permiso_por_roles

# Única fuente de verdad de los roles del módulo. El frontend los replica en
# frontend/src/app/modelos/permisos-asistente.ts y deben mantenerse iguales.
ROLES_ENTRENAMIENTO_ASISTENTE = ('administrador',)


class PermisosAsistenteMixin:
    """Cualquier autenticado consulta; solo el entrenamiento (escritura) exige rol."""

    acciones_escritura = ('create', 'update', 'partial_update', 'destroy')

    def get_permissions(self):
        if self.action in self.acciones_escritura:
            return [IsAuthenticated(), permiso_por_roles(*ROLES_ENTRENAMIENTO_ASISTENTE)()]
        return [IsAuthenticated()]


def puede_entrenar(usuario):
    return usuario.rol in ROLES_ENTRENAMIENTO_ASISTENTE
