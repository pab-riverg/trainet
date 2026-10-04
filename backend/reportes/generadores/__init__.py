"""Generadores de informes de gestión: funciones puras generar(desde, hasta) -> dict de contenido.

No dependen de la request, así que el dashboard de Inicio puede importarlas directamente.
"""
from . import asistente, capacitacion, compras, general, proveedores, recursos, soporte

GENERADORES = {
    'soporte': soporte.generar,
    'recursos': recursos.generar,
    'compras': compras.generar,
    'capacitacion': capacitacion.generar,
    'proveedores': proveedores.generar,
    'asistente': asistente.generar,
    'general': general.generar,
}
