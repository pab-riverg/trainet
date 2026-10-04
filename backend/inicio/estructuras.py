"""Constructores de las tarjetas de /api/inicio/. Contrato genérico: el frontend pinta según `tipo`, sin lógica de roles.

Toda tarjeta tiene: clave, titulo, tipo y, opcionalmente, ruta_ver_todo (ruta del frontend).

- tipo "metricas":    metricas = [{etiqueta, valor, ruta?}]
- tipo "lista":       items = [{titulo, subtitulo, estado, ruta}] (máximo 5) y total (cantidad real, puede ser mayor)
- tipo "progreso":    item = {titulo, subtitulo, porcentaje (0-100), estado}
- tipo "acceso_triny": sin datos; el frontend pinta el cuadro "¿En qué piensas hoy?"
"""

MAX_ITEMS_LISTA = 5


def _base(clave, titulo, tipo, ruta_ver_todo):
    tarjeta = {'clave': clave, 'titulo': titulo, 'tipo': tipo}
    if ruta_ver_todo:
        tarjeta['ruta_ver_todo'] = ruta_ver_todo
    return tarjeta


def metrica(etiqueta, valor, ruta=None):
    datos = {'etiqueta': etiqueta, 'valor': valor}
    if ruta:
        datos['ruta'] = ruta
    return datos


def item_lista(titulo, subtitulo, estado, ruta):
    return {'titulo': titulo, 'subtitulo': subtitulo, 'estado': estado, 'ruta': ruta}


def tarjeta_metricas(clave, titulo, metricas, ruta_ver_todo=None):
    return {**_base(clave, titulo, 'metricas', ruta_ver_todo), 'metricas': metricas}


def tarjeta_lista(clave, titulo, items, total, ruta_ver_todo=None):
    return {**_base(clave, titulo, 'lista', ruta_ver_todo), 'items': items[:MAX_ITEMS_LISTA], 'total': total}


def tarjeta_progreso(clave, titulo, item_titulo, subtitulo, porcentaje, estado, ruta_ver_todo=None):
    item = {'titulo': item_titulo, 'subtitulo': subtitulo, 'porcentaje': porcentaje, 'estado': estado}
    return {**_base(clave, titulo, 'progreso', ruta_ver_todo), 'item': item}


def tarjeta_acceso_triny(clave='acceso_triny', titulo='Triny', ruta_ver_todo='/triny'):
    return _base(clave, titulo, 'acceso_triny', ruta_ver_todo)
