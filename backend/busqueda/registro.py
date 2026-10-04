"""Registro de buscadores: clave del módulo (inicio/modulos.py) -> función buscar(usuario, texto, limite).

Un módulo solo se consulta si el registro de módulos lo declara visible para el rol del usuario.
"""
from .buscadores import capacitacion, compras, documentos, inventario, proveedores, recursos, reportes, soporte, usuarios

BUSCADORES = {
    'usuarios': usuarios.buscar,
    'proveedores': proveedores.buscar,
    'capacitacion': capacitacion.buscar,
    'documentos': documentos.buscar,
    'soporte': soporte.buscar,
    'compras': compras.buscar,
    'recursos': recursos.buscar,
    'inventario': inventario.buscar,
    'reportes': reportes.buscar,
}
