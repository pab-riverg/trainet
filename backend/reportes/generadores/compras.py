from django.db.models import Count, Sum

from compras.models import ItemSolicitud, ModuloComprasInternas, SolicitudCompra

from .base import conteo_por, contenido, etiquetas, grafico_barras, limites, seccion

ESTADOS_COMPRADOS = ['comprada', 'entregada', 'en_revision', 'recibida']


def generar(desde, hasta):
    solicitudes = SolicitudCompra.objects.filter(fecha_solicitud__range=(desde, hasta))
    total = solicitudes.count()
    por_estado = conteo_por(solicitudes, 'estado')
    estimado_por_estado = {
        f['estado']: f['monto'] or 0 for f in solicitudes.values('estado').annotate(monto=Sum('total_estimado'))
    }

    # Lo comprado se mide por la fecha en que se confirmó la compra, con el total de su orden de compra.
    inicio, fin = limites(desde, hasta)
    comprado = SolicitudCompra.objects.filter(fecha_compra__gte=inicio, fecha_compra__lt=fin, fo_orden__isnull=False)
    total_comprado = comprado.aggregate(t=Sum('fo_orden__total'))['t'] or 0
    n_compradas = comprado.count()

    modulo = ModuloComprasInternas.objects.order_by('id').first()
    presupuesto = modulo.presupuesto_disponible if modulo else 0

    filas_estado = [
        [etiqueta, por_estado.get(codigo, 0), estimado_por_estado.get(codigo, 0)]
        for codigo, etiqueta in etiquetas(SolicitudCompra, 'estado')
    ]
    filas_top = [
        [f['fo_articulo__nombre'], f['unidades'] or 0, f['solicitudes']]
        for f in ItemSolicitud.objects.filter(fo_solicitud__fecha_solicitud__range=(desde, hasta))
        .values('fo_articulo__nombre')
        .annotate(unidades=Sum('cantidad'), solicitudes=Count('fo_solicitud', distinct=True))
        .order_by('-unidades', 'fo_articulo__nombre')[:10]
    ]

    return contenido(
        'Informe de compras internas', desde, hasta,
        indicadores=[
            ('Solicitudes en el rango', total),
            ('Pendientes', por_estado.get('pendiente', 0)),
            ('Total estimado solicitado', sum(estimado_por_estado.values())),
            ('Compras confirmadas en el rango', n_compradas),
            ('Total comprado (órdenes de compra)', total_comprado),
            ('Presupuesto disponible actual', presupuesto),
        ],
        secciones=[
            seccion('Solicitudes por estado', ['Estado', 'Solicitudes', 'Total estimado'], filas_estado),
            seccion('Artículos más solicitados (top 10)', ['Artículo', 'Unidades', 'Solicitudes'], filas_top),
        ],
        graficos=[
            grafico_barras('Solicitudes por estado', [f[0] for f in filas_estado], [('Solicitudes', [f[1] for f in filas_estado])]),
        ],
        nota_vacio='No hubo solicitudes de compra en el rango seleccionado.',
        hay_datos=total > 0,
    )
