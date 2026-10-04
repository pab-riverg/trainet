from django.db.models import Count, Q

from capacitacion.models import Capacitacion, Curso, ParticipanteCapacitacion

from .base import contenido, grafico_barras, porcentaje, seccion


def generar(desde, hasta):
    # Capacitaciones que inician dentro del rango.
    capacitaciones = Capacitacion.objects.filter(fecha_inicio__range=(desde, hasta))
    total = capacitaciones.count()
    participantes = ParticipanteCapacitacion.objects.filter(fo_capacitacion__in=capacitaciones)
    inscritos = participantes.count()
    asistieron = participantes.filter(asistio=True).count()

    filas_cap = [
        [c['fo_curso__titulo'], c['fecha_inicio'].strftime('%d/%m/%Y'), c['fecha_fin'].strftime('%d/%m/%Y'),
         c['modalidad'], c['inscritos'], c['asistieron'],
         porcentaje(c['asistieron'], c['inscritos'])]
        for c in capacitaciones.values('id', 'fo_curso__titulo', 'fecha_inicio', 'fecha_fin', 'modalidad')
        .annotate(inscritos=Count('participantecapacitacion'),
                  asistieron=Count('participantecapacitacion', filter=Q(participantecapacitacion__asistio=True)))
        .order_by('fecha_inicio', 'id')
    ]
    # Los cursos no tienen fecha de cierre: se muestra el estado actual de todo el catálogo.
    filas_cursos = [
        [c['estado'] or 'Sin estado', c['total']]
        for c in Curso.objects.values('estado').annotate(total=Count('id')).order_by('-total', 'estado')
    ]

    return contenido(
        'Informe de capacitación', desde, hasta,
        indicadores=[
            ('Capacitaciones del rango', total),
            ('Participantes inscritos', inscritos),
            ('Participantes que asistieron', asistieron),
            ('% de asistencia', porcentaje(asistieron, inscritos)),
            ('Cursos en el catálogo', sum(f[1] for f in filas_cursos)),
        ],
        secciones=[
            seccion('Capacitaciones del rango',
                    ['Curso', 'Inicio', 'Fin', 'Modalidad', 'Inscritos', 'Asistieron', '% asistencia'], filas_cap),
            seccion('Cursos por estado (estado actual)', ['Estado', 'Cursos'], filas_cursos),
        ],
        graficos=[
            grafico_barras('Asistencia por capacitación', [f[0] for f in filas_cap[:12]],
                           [('Inscritos', [f[4] for f in filas_cap[:12]]), ('Asistieron', [f[5] for f in filas_cap[:12]])])
        ] if filas_cap else [],
        nota_vacio='No hay capacitaciones que inicien en el rango seleccionado.',
        hay_datos=total > 0,
    )
