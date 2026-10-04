from django.db.models import Avg, Count

from soporte.models import TicketSoporte

from .base import conteo_por, contenido, etiquetas, grafico_barras, porcentaje, seccion


def generar(desde, hasta):
    tickets = TicketSoporte.objects.filter(fecha_creacion__range=(desde, hasta))
    total = tickets.count()
    por_estado = conteo_por(tickets, 'estado')
    por_prioridad = conteo_por(tickets, 'prioridad')

    atendidos = tickets.filter(estado__in=['resuelto', 'cerrado'])
    n_atendidos = atendidos.count()
    # Días entre creación y resolución, solo de tickets con fecha de resolución.
    tiempo_medio = tickets.filter(fecha_resolucion__isnull=False).aggregate(m=Avg('tiempo_resolucion'))['m']

    filas_estado = [[etiqueta, por_estado.get(codigo, 0)] for codigo, etiqueta in etiquetas(TicketSoporte, 'estado')]
    filas_prioridad = [[etiqueta, por_prioridad.get(codigo, 0)] for codigo, etiqueta in etiquetas(TicketSoporte, 'prioridad')]
    filas_categoria = [
        [f['fo_categoria_ticket__nombre_categoria'], f['total']]
        for f in tickets.values('fo_categoria_ticket__nombre_categoria').annotate(total=Count('id'))
        .order_by('-total', 'fo_categoria_ticket__nombre_categoria')
    ]

    return contenido(
        'Informe de soporte técnico', desde, hasta,
        indicadores=[
            ('Tickets creados', total),
            ('Abiertos', por_estado.get('abierto', 0)),
            ('En proceso', por_estado.get('en_proceso', 0)),
            ('Resueltos o cerrados', n_atendidos),
            ('% resueltos o cerrados', porcentaje(n_atendidos, total)),
            ('Tiempo medio de resolución (días)', round(tiempo_medio, 1) if tiempo_medio is not None else 'Sin datos'),
        ],
        secciones=[
            seccion('Tickets por estado', ['Estado', 'Tickets'], filas_estado),
            seccion('Tickets por categoría', ['Categoría', 'Tickets'], filas_categoria),
            seccion('Tickets por prioridad', ['Prioridad', 'Tickets'], filas_prioridad),
        ],
        graficos=[grafico_barras('Tickets por estado', [f[0] for f in filas_estado], [('Tickets', [f[1] for f in filas_estado])])],
        nota_vacio='No se crearon tickets en el rango seleccionado.',
        hay_datos=total > 0,
    )
