from rest_framework.permissions import IsAuthenticated

from usuarios.permissions import permiso_por_roles

# Única fuente de verdad de los roles del módulo. El frontend los replica en
# frontend/src/app/modelos/permisos-proveedores.ts y deben mantenerse iguales.
ROLES_GESTION_PROVEEDORES = ('administrador', 'encargado_administrativo', 'recursos_humanos')
# El encargado de formación solo consulta el directorio (no crea, edita ni archiva). El proveedor de contenido no entra.
ROLES_LECTURA_PROVEEDORES = ROLES_GESTION_PROVEEDORES + ('directivo', 'supervisor', 'encargado_formacion')
# Doble check: solo estos roles aprueban o rechazan un acuerdo (el administrador puede aprobar el suyo).
ROLES_APROBACION_ACUERDOS = ('administrador', 'directivo')


class PermisosProveedoresMixin:
    """Gestión para escribir, lectura ampliada para consultar; el resto de roles recibe 403."""

    acciones_escritura = ('create', 'update', 'partial_update', 'destroy')
    acciones_aprobacion = ()

    def get_permissions(self):
        if self.action in self.acciones_aprobacion:
            roles = ROLES_APROBACION_ACUERDOS
        elif self.action in self.acciones_escritura:
            roles = ROLES_GESTION_PROVEEDORES
        else:
            roles = ROLES_LECTURA_PROVEEDORES
        return [IsAuthenticated(), permiso_por_roles(*roles)()]
