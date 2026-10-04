from . import asistente, capacitacion, compras, proveedores, recursos, soporte
from .base import contenido, grafico_barras, seccion

MODULOS = [
    ('Soporte técnico', soporte),
    ('Pedidos de recursos', recursos),
    ('Compras internas', compras),
    ('Capacitación', capacitacion),
    ('Proveedores', proveedores),
    ('Asistente virtual', asistente),
]


def generar(desde, hasta):
    filas, principales = [], []
    for nombre, modulo in MODULOS:
        informe = modulo.generar(desde, hasta)
        for indicador in informe['indicadores']:
            filas.append([nombre, indicador['etiqueta'], indicador['valor']])
        # El primer indicador de cada módulo es su total principal.
        principales.append((nombre, informe['indicadores'][0]))

    return contenido(
        'Resumen general de gestión', desde, hasta,
        indicadores=[(f'{nombre}: {i["etiqueta"]}', i['valor']) for nombre, i in principales],
        secciones=[seccion('Indicadores clave por módulo', ['Módulo', 'Indicador', 'Valor'], filas)],
        graficos=[grafico_barras(
            'Registros del rango por módulo', [nombre for nombre, _ in principales],
            [('Registros', [i['valor'] if isinstance(i['valor'], (int, float)) else 0 for _, i in principales])]
        )],
    )
