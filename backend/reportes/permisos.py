from django.db.models import Q
from rest_framework.permissions import IsAuthenticated

from usuarios.permissions import permiso_por_roles

# Única fuente de verdad de los permisos del módulo de Reportes: las vistas y el registro de módulos
# (inicio/modulos.py) la importan. El frontend la refleja en frontend/src/app/modelos/permisos-reportes.ts
# y deben mantenerse iguales; aun así, quien manda es siempre el backend (responde 403).

# Valor de `tipos` para los roles sin restricción de tipo de informe.
TODOS_LOS_TIPOS = '*'

# Clave del tipo de informe que produce el consolidado de archivos.
TIPO_CONSOLIDADO = 'consolidado'

# rol -> qué puede hacer en Reportes.
#   puede_importar:   importar archivos y gestionar (editar, archivar, restaurar, eliminar) los suyos.
#   puede_consolidar: consolidar archivos en un informe de tipo "consolidado".
#   tipos:            claves de los informes que puede generar, ver y exportar (o TODOS_LOS_TIPOS).
# Ver, generar y exportar un informe dentro de `tipos` va de la mano: no hay roles que solo vean.
PERMISOS_REPORTES = {
    'administrador': {'puede_importar': True, 'puede_consolidar': True, 'tipos': TODOS_LOS_TIPOS},
    'directivo': {'puede_importar': False, 'puede_consolidar': True, 'tipos': TODOS_LOS_TIPOS},
    'recursos_humanos': {'puede_importar': True, 'puede_consolidar': True, 'tipos': ('capacitacion', 'asistente')},
    'supervisor': {'puede_importar': False, 'puede_consolidar': False, 'tipos': ('capacitacion', 'recursos')},
    'encargado_documental': {'puede_importar': True, 'puede_consolidar': True, 'tipos': (TIPO_CONSOLIDADO,)},
}

# Roles que ven TODOS los archivos importados (el administrador los gestiona; el directivo solo los consulta).
# El resto de roles con permiso de importar ve y gestiona solo los que importó él.
ROLES_VEN_TODOS_LOS_ARCHIVOS = ('administrador', 'directivo')

# Escribir sobre los informes y los catálogos: eliminar informes, crear/editar tipos de reporte.
ROLES_GESTION_REPORTES = ('administrador',)
# Entrar al módulo, ver informes y generarlos/exportarlos (cada rol, solo de sus tipos).
ROLES_LECTURA_REPORTES = tuple(PERMISOS_REPORTES)
# Importar archivos y gestionar los propios.
ROLES_IMPORTACION_REPORTES = tuple(rol for rol, p in PERMISOS_REPORTES.items() if p['puede_importar'])
# Consolidar archivos.
ROLES_CONSOLIDACION_REPORTES = tuple(rol for rol, p in PERMISOS_REPORTES.items() if p['puede_consolidar'])
# Ver la sección de archivos (todos o solo los propios).
ROLES_ARCHIVOS_REPORTES = tuple(dict.fromkeys(ROLES_VEN_TODOS_LOS_ARCHIVOS + ROLES_IMPORTACION_REPORTES))


def _rol_de(usuario):
    return getattr(usuario, 'rol', None) if getattr(usuario, 'is_authenticated', False) else None


def permisos_de(usuario):
    """Permisos de Reportes del usuario; None si su rol no tiene acceso al módulo."""
    return PERMISOS_REPORTES.get(_rol_de(usuario))


def puede_importar(usuario):
    permisos = permisos_de(usuario)
    return bool(permisos and permisos['puede_importar'])


def puede_consolidar(usuario):
    permisos = permisos_de(usuario)
    return bool(permisos and permisos['puede_consolidar'])


def ve_todos_los_archivos(usuario):
    return _rol_de(usuario) in ROLES_VEN_TODOS_LOS_ARCHIVOS


def tipos_permitidos(usuario):
    """Claves de los informes permitidos al usuario, o None si no tiene restricción de tipo.

    Quien puede consolidar siempre puede ver el consolidado que produce, aunque su lista de tipos no lo nombre.
    Un rol sin acceso al módulo recibe un conjunto vacío.
    """
    permisos = permisos_de(usuario)
    if permisos is None:
        return frozenset()
    if permisos['tipos'] == TODOS_LOS_TIPOS:
        return None
    tipos = set(permisos['tipos'])
    if permisos['puede_consolidar']:
        tipos.add(TIPO_CONSOLIDADO)
    return frozenset(tipos)


def puede_usar_tipo(usuario, clave):
    """True si el usuario puede generar, ver y exportar informes de ese tipo."""
    tipos = tipos_permitidos(usuario)
    return tipos is None or clave in tipos


def puede_ver_informe(usuario, reporte):
    """Un informe se ve si su tipo está permitido; los consolidados, además, solo los ve quien los hizo
    (mezclan datos de archivos que cada usuario gestiona por separado). Administrador y directivo ven todo."""
    clave = reporte.fo_tipo_reporte.clave
    if not puede_usar_tipo(usuario, clave):
        return False
    if tipos_permitidos(usuario) is None:
        return True
    return clave != TIPO_CONSOLIDADO or reporte.fo_usuario_id == usuario.pk


def filtrar_tipos(queryset, usuario):
    """Tipos de reporte visibles: los de sistema permitidos y, si puede importar, las categorías de archivo."""
    if tipos_permitidos(usuario) is None:
        return queryset
    filtro = Q(origen='sistema', clave__in=tipos_permitidos(usuario))
    if puede_importar(usuario):
        filtro |= Q(origen='archivo')
    return queryset.filter(filtro)


def filtrar_informes(queryset, usuario):
    """Informes visibles (equivale a puede_ver_informe, pero en la consulta)."""
    tipos = tipos_permitidos(usuario)
    if tipos is None:
        return queryset
    return queryset.filter(fo_tipo_reporte__clave__in=tipos).filter(
        ~Q(fo_tipo_reporte__clave=TIPO_CONSOLIDADO) | Q(fo_usuario=usuario))


def filtrar_archivos(queryset, usuario):
    """Archivos importados visibles: todos para administrador y directivo; solo los propios para el resto."""
    if ve_todos_los_archivos(usuario):
        return queryset
    return queryset.filter(fo_usuario=usuario)


class PermisosReportesMixin:
    """Roles por acción; el resto de roles recibe 403.

    - `acciones_gestion`: solo administrador. `acciones_importacion`: roles con permiso de importar.
    - `acciones_consolidacion`: roles con permiso de consolidar.
    - Cualquier otra acción (lectura, generar, exportar) usa `roles_lectura`; el tipo/propietario se valida en la vista.
    """

    acciones_gestion = ('create', 'update', 'partial_update', 'destroy', 'archivar', 'restaurar')
    acciones_importacion = ()
    acciones_consolidacion = ()
    roles_lectura = ROLES_LECTURA_REPORTES

    def get_permissions(self):
        if self.action in self.acciones_gestion:
            roles = ROLES_GESTION_REPORTES
        elif self.action in self.acciones_importacion:
            roles = ROLES_IMPORTACION_REPORTES
        elif self.action in self.acciones_consolidacion:
            roles = ROLES_CONSOLIDACION_REPORTES
        else:
            roles = self.roles_lectura
        return [IsAuthenticated(), permiso_por_roles(*roles)()]
