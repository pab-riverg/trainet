from django.db.models import Count

from asistente.models import HistorialConsulta

from .base import contenido, grafico_barras, limites, porcentaje, seccion


def generar(desde, hasta):
    inicio, fin = limites(desde, hasta)
    consultas = HistorialConsulta.objects.filter(fecha__gte=inicio, fecha__lt=fin)
    total = consultas.count()
    resueltas = consultas.filter(resuelta=True).count()
    valoradas = consultas.filter(util__isnull=False).count()
    utiles = consultas.filter(util=True).count()
    por_origen = {f['origen']: f['total'] for f in consultas.values('origen').annotate(total=Count('id'))}

    # Lo que Triny no supo responder (agrupado por texto), para decidir qué preguntas entrenar.
    filas_sin_respuesta = [
        [f['pregunta_usuario'], f['veces']]
        for f in consultas.filter(resuelta=False).values('pregunta_usuario')
        .annotate(veces=Count('id')).order_by('-veces', 'pregunta_usuario')[:10]
    ]

    return contenido(
        'Informe del asistente virtual Triny', desde, hasta,
        indicadores=[
            ('Consultas totales', total),
            ('Consultas resueltas', resueltas),
            ('% resueltas', porcentaje(resueltas, total)),
            ('Consultas valoradas', valoradas),
            ('% valoradas como útiles', porcentaje(utiles, valoradas)),
        ],
        secciones=[
            seccion('Consultas por origen', ['Origen', 'Consultas'],
                    [['Texto escrito', por_origen.get('texto', 0)], ['Menú', por_origen.get('menu', 0)]]),
            seccion('Preguntas sin respuesta más frecuentes (top 10)', ['Texto', 'Veces'], filas_sin_respuesta,
                    nota=None if filas_sin_respuesta else 'No hubo consultas sin respuesta en el rango.'),
        ],
        graficos=[grafico_barras('Resultado de las consultas', ['Resueltas', 'Sin resolver'],
                                 [('Consultas', [resueltas, total - resueltas])])],
        nota_vacio='No hubo consultas al asistente en el rango seleccionado.',
        hay_datos=total > 0,
    )
