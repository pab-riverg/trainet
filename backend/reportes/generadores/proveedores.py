from django.db.models import Count

from proveedores.models import ContratoProveedor, NecesidadCapacitacionExterna, Proveedor

from .base import conteo_por, contenido, etiquetas, grafico_barras, seccion


def generar(desde, hasta):
    # Los acuerdos no tienen fecha de creación: cuentan los que estuvieron en curso durante el rango.
    acuerdos = ContratoProveedor.objects.filter(fecha_inicio__lte=hasta, fecha_fin__gte=desde)
    total_acuerdos = acuerdos.count()
    acuerdos_estado = conteo_por(acuerdos, 'estado')
    proveedores_estado = conteo_por(Proveedor.objects.all(), 'estado')
    necesidades = NecesidadCapacitacionExterna.objects.filter(fecha__range=(desde, hasta))
    total_necesidades = necesidades.count()

    filas_acuerdos = [
        [etiqueta, acuerdos_estado.get(codigo, 0)]
        for codigo, etiqueta in ContratoProveedor._meta.get_field('estado').choices
    ]
    filas_proveedores = [
        [etiqueta, proveedores_estado.get(codigo, 0)] for codigo, etiqueta in etiquetas(Proveedor, 'estado')
    ]
    # Las necesidades de capacitación no manejan estados: se agrupan por área.
    filas_necesidades = [
        [f['area'], f['total']]
        for f in necesidades.values('area').annotate(total=Count('id')).order_by('-total', 'area')
    ]

    return contenido(
        'Informe de proveedores', desde, hasta,
        indicadores=[
            ('Proveedores registrados', sum(proveedores_estado.values())),
            ('Proveedores contratados', proveedores_estado.get('contratado', 0)),
            ('Acuerdos en curso en el rango', total_acuerdos),
            ('Acuerdos vigentes', acuerdos_estado.get('vigente', 0)),
            ('Necesidades de capacitación registradas', total_necesidades),
        ],
        secciones=[
            seccion('Acuerdos en curso por estado', ['Estado', 'Acuerdos'], filas_acuerdos),
            seccion('Proveedores por estado (estado actual)', ['Estado', 'Proveedores'], filas_proveedores),
            seccion('Necesidades de capacitación por área', ['Área', 'Necesidades'], filas_necesidades,
                    nota=None if filas_necesidades else 'No se registraron necesidades en el rango.'),
        ],
        graficos=[
            grafico_barras('Acuerdos por estado', [f[0] for f in filas_acuerdos], [('Acuerdos', [f[1] for f in filas_acuerdos])]),
        ],
        nota_vacio='No hubo acuerdos en curso en el rango seleccionado.',
        hay_datos=total_acuerdos > 0,
    )
