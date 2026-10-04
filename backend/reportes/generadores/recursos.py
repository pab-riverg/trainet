from django.db.models import Count, Sum

from recursos.models import SolicitudRecursos

from .base import conteo_por, contenido, etiquetas, grafico_barras, seccion, seccion_total_conocido

MAX_PENDIENTES = 500


def generar(desde, hasta):
    pedidos = SolicitudRecursos.objects.filter(fecha_solicitud__range=(desde, hasta))
    total = pedidos.count()
    por_estado = conteo_por(pedidos, 'estado')
    por_prioridad = conteo_por(pedidos, 'prioridad')
    sumas = pedidos.aggregate(unidades=Sum('cantidad'), presupuesto=Sum('presupuesto_estimado'))

    filas_estado = [[etiqueta, por_estado.get(codigo, 0)] for codigo, etiqueta in etiquetas(SolicitudRecursos, 'estado')]
    filas_prioridad = [[etiqueta, por_prioridad.get(codigo, 0)] for codigo, etiqueta in etiquetas(SolicitudRecursos, 'prioridad')]
    filas_tipo = [
        [f['fo_tipo_recurso__nombre_tipo'], f['total'], f['unidades'] or 0]
        for f in pedidos.values('fo_tipo_recurso__nombre_tipo')
        .annotate(total=Count('id'), unidades=Sum('cantidad'))
        .order_by('-total', 'fo_tipo_recurso__nombre_tipo')
    ]

    pendientes = pedidos.filter(estado='pendiente').select_related('fo_tipo_recurso', 'fo_usuario').order_by('fecha_solicitud', 'id')
    n_pendientes = por_estado.get('pendiente', 0)
    filas_pendientes = [
        [p.id, p.fecha_solicitud.strftime('%d/%m/%Y'), p.fo_tipo_recurso.nombre_tipo, p.fo_usuario.nombre, p.cantidad, p.prioridad]
        for p in pendientes[:MAX_PENDIENTES]
    ]

    return contenido(
        'Informe de pedidos de recursos', desde, hasta,
        indicadores=[
            ('Pedidos en el rango', total),
            ('Pendientes', n_pendientes),
            ('Aprobados', por_estado.get('aprobado', 0)),
            ('Entregados', por_estado.get('entregado', 0)),
            ('Rechazados', por_estado.get('rechazado', 0)),
            ('Unidades solicitadas', sumas['unidades'] or 0),
            ('Presupuesto estimado total', sumas['presupuesto'] or 0),
        ],
        secciones=[
            seccion('Pedidos por estado', ['Estado', 'Pedidos'], filas_estado),
            seccion('Pedidos por tipo de recurso', ['Tipo de recurso', 'Pedidos', 'Unidades'], filas_tipo),
            seccion('Pedidos por prioridad', ['Prioridad', 'Pedidos'], filas_prioridad),
            seccion_total_conocido('Pedidos pendientes', ['#', 'Fecha', 'Tipo de recurso', 'Solicitante', 'Cantidad', 'Prioridad'],
                                   filas_pendientes, n_pendientes),
        ],
        graficos=[
            grafico_barras('Pedidos por estado', [f[0] for f in filas_estado], [('Pedidos', [f[1] for f in filas_estado])]),
        ],
        nota_vacio='No hubo pedidos de recursos en el rango seleccionado.',
        hay_datos=total > 0,
    )
