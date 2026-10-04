from rest_framework.permissions import BasePermission


class EsAdministrador(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.rol == 'administrador')


class EsAdministradorOMismoUsuario(BasePermission):
    def has_object_permission(self, request, view, obj):
        return bool(
            request.user.is_authenticated and
            (request.user.rol == 'administrador' or request.user.id == obj.id)
        )


def permiso_por_roles(*roles_permitidos):
    class _PermisoPorRoles(BasePermission):
        def has_permission(self, request, view):
            return bool(
                request.user.is_authenticated and
                request.user.rol in roles_permitidos
            )
    return _PermisoPorRoles


# Roles que gestionan usuarios y empleados (EmpleadoViewSet escribe con administrador y recursos_humanos;
# crear y eliminar usuarios es solo del administrador). Fuente única para el menú del módulo Usuarios.
ROLES_GESTION_USUARIOS = ('administrador', 'recursos_humanos')
