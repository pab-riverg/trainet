from rest_framework.permissions import BasePermission


class EsAdministrador(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.rol == 'administrador')


def permiso_por_roles(*roles_permitidos):
    class _PermisoPorRoles(BasePermission):
        def has_permission(self, request, view):
            return bool(
                request.user.is_authenticated and
                request.user.rol in roles_permitidos
            )
    return _PermisoPorRoles
