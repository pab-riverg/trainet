from urllib.parse import quote


def ruta_resultado(ruta_modulo, vista, texto):
    """Ruta a la LISTA o pestaña de un módulo con el texto codificado en `q` (nunca a un detalle ni con ids)."""
    parametros = []
    if vista:
        parametros.append('vista=' + quote(vista, safe=''))
    if texto:
        parametros.append('q=' + quote(texto, safe=''))
    return ruta_modulo + ('?' + '&'.join(parametros) if parametros else '')
