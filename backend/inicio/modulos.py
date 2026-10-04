"""Registro central de módulos del menú lateral: fuente única de visibilidad por rol.

Las listas de roles no se escriben a mano: se importan de los permisos.py de cada módulo. Un módulo es visible
para un rol si ese rol puede, al menos, LEER. Los módulos cuya lectura está abierta a cualquier usuario autenticado
(capacitación, documentos, soporte, recursos e inventario) se registran con TODOS_LOS_ROLES: su permiso de
escritura (ROLES_GESTION_*) restringe qué se puede hacer dentro, no si el módulo se ve.
"""
from dataclasses import dataclass

from administracion.permisos import ROLES_ADMINISTRACION
from compras.permisos import ROLES_VISTA_COMPRAS
from dashboard.permisos import ROLES_DASHBOARD
from proveedores.permisos import ROLES_LECTURA_PROVEEDORES
from reportes.permisos import ROLES_LECTURA_REPORTES
from usuarios.models import Usuario
from usuarios.permissions import ROLES_GESTION_USUARIOS

TODOS_LOS_ROLES = tuple(codigo for codigo, _ in Usuario.ROL_CHOICES)


@dataclass(frozen=True)
class Modulo:
    clave: str
    titulo: str
    ruta: str
    icono: str
    roles: tuple
    seccion: str = 'principal'  # principal | gestion | mas | sistema
    en_menu: bool = True


# El orden de esta lista es el orden del menú lateral.
MODULOS = (
    Modulo('inicio', 'Inicio', '/inicio', 'bi-house-door', TODOS_LOS_ROLES, 'principal'),
    Modulo('dashboard', 'Dashboard', '/dashboard', 'bi-grid-1x2', ROLES_DASHBOARD, 'principal'),
    Modulo('triny', 'Triny AI', '/triny', 'bi-robot', TODOS_LOS_ROLES, 'principal'),
    Modulo('administrador', 'Administrador', '/administrador', 'bi-person-gear', ROLES_ADMINISTRACION, 'gestion'),
    Modulo('inventario', 'Inventario', '/inventario', 'bi-boxes', TODOS_LOS_ROLES, 'gestion'),
    Modulo('usuarios', 'Usuarios', '/usuarios', 'bi-people', ROLES_GESTION_USUARIOS, 'gestion'),
    Modulo('compras', 'Compras internas', '/compras', 'bi-bag', ROLES_VISTA_COMPRAS, 'gestion'),
    Modulo('reportes', 'Reportes', '/reportes', 'bi-bar-chart', ROLES_LECTURA_REPORTES, 'gestion'),
    Modulo('capacitacion', 'Capacitación', '/capacitacion', 'bi-mortarboard', TODOS_LOS_ROLES, 'mas'),
    Modulo('documentos', 'Documentos', '/documentos', 'bi-folder2-open', TODOS_LOS_ROLES, 'mas'),
    Modulo('soporte', 'Soporte técnico', '/soporte', 'bi-headset', TODOS_LOS_ROLES, 'mas'),
    Modulo('recursos', 'Pedido de recursos', '/recursos', 'bi-box-seam', TODOS_LOS_ROLES, 'mas'),
    Modulo('proveedores', 'Proveedores', '/proveedores', 'bi-truck', ROLES_LECTURA_PROVEEDORES, 'mas'),
    Modulo('ajustes', 'Ajustes', '/ajustes', 'bi-gear', TODOS_LOS_ROLES, 'sistema'),
    Modulo('ayuda', 'Ayuda', '/ayuda', 'bi-question-circle', TODOS_LOS_ROLES, 'sistema'),
    # El perfil no va en el menú lateral (se abre desde la barra superior).
    Modulo('perfil', 'Mi perfil', '/perfil', 'bi-person-circle', TODOS_LOS_ROLES, 'sistema', en_menu=False),
)

_POR_CLAVE = {modulo.clave: modulo for modulo in MODULOS}


def rol_ve_modulo(rol, clave):
    return rol in _POR_CLAVE[clave].roles


def modulos_visibles(rol):
    """Módulos del menú lateral que el rol puede ver, en el orden del menú."""
    return [
        {'clave': m.clave, 'titulo': m.titulo, 'ruta': m.ruta, 'icono': m.icono, 'seccion': m.seccion}
        for m in MODULOS if m.en_menu and rol in m.roles
    ]
