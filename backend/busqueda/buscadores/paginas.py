"""Grupo "Páginas": módulos visibles del menú cuyo título o palabras clave coinciden con el texto.

No es un buscador de datos: devuelve claves de módulo y la vista arma el resultado con su título y ruta
(siempre la ruta del módulo, sin q).
"""
import unicodedata

# clave del registro de módulos -> palabras clave que llevan a esa página (se compara sin tildes ni mayúsculas).
PALABRAS_CLAVE_PAGINAS = {
    'inicio': ('inicio', 'resumen', 'tarjetas'),
    'dashboard': ('dashboard', 'indicadores', 'estadisticas', 'graficos', 'gerencial'),
    'triny': ('triny', 'asistente', 'chat', 'inteligencia artificial'),
    'administrador': ('administrador', 'bitacora', 'auditoria', 'configuracion', 'panel de control'),
    'inventario': ('inventario', 'contenido', 'contenidos', 'videos', 'presentaciones'),
    'usuarios': ('usuarios', 'empleados', 'personal', 'cuentas', 'roles'),
    'compras': ('compras', 'compras internas', 'facturas', 'cotizaciones', 'articulos', 'tienda', 'carrito'),
    'reportes': ('reportes', 'informes', 'analisis', 'consolidado', 'exportar', 'importar archivos'),
    'capacitacion': ('capacitacion', 'cursos', 'materiales', 'inscripciones', 'asistencia', 'evidencias'),
    'documentos': ('documentos', 'biblioteca', 'manuales', 'archivos'),
    'soporte': ('soporte', 'soporte tecnico', 'tickets', 'ayuda tecnica', 'incidencias', 'reportar un problema'),
    'recursos': ('recursos', 'pedidos', 'pedido de recursos', 'solicitar recursos'),
    'proveedores': ('proveedores', 'acuerdos', 'contratos', 'directorio', 'necesidades de capacitacion'),
    'ajustes': ('ajustes', 'preferencias', 'cuenta', 'contrasena'),
    'ayuda': ('ayuda', 'preguntas frecuentes', 'faq', 'guia de uso'),
}


def normalizar(texto):
    """Minúsculas y sin tildes, para comparar palabras clave."""
    descompuesto = unicodedata.normalize('NFD', texto.lower())
    return ''.join(c for c in descompuesto if unicodedata.category(c) != 'Mn')


def claves_que_coinciden(modulos, texto):
    """Claves (en orden del menú) de los `modulos` visibles [{'clave', 'titulo', ...}] que coinciden con `texto`."""
    buscado = normalizar(texto)
    return [m['clave'] for m in modulos
            if buscado in normalizar(m['titulo'])
            or any(buscado in palabra for palabra in PALABRAS_CLAVE_PAGINAS.get(m['clave'], ()))]
