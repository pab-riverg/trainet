"""Tarjetas de formación, personal y contenido documental."""
from django.db.models import Avg, Count, F, OuterRef, Q, Subquery
from django.utils import timezone

from capacitacion.models import Curso, ParticipanteCapacitacion, ProgresoCurso
from documentos.models import Documento
from usuarios.models import Capacitador, Empleado

from ..estructuras import MAX_ITEMS_LISTA, item_lista, metrica, tarjeta_lista, tarjeta_metricas


def cursos_y_aprendices(usuario):
    """Cursos con inscritos y avance promedio. El encargado de formación ve todos; el capacitador, los que imparte
    (por la tabla de cursos impartidos o por ser instructor de alguna capacitación)."""
    cursos = Curso.objects.all()
    if usuario.rol == 'capacitador':
        capacitador = Capacitador.objects.filter(fo_usuario=usuario).first()
        if capacitador is None:
            return None
        cursos = cursos.filter(
            Q(cursosimpartidos__fo_capacitador=capacitador) | Q(capacitacion__fo_instructor=capacitador)
        ).distinct()

    # Subconsultas para no multiplicar filas al combinar relaciones de varios valores.
    inscritos = (ParticipanteCapacitacion.objects.filter(fo_capacitacion__fo_curso=OuterRef('pk'))
                 .values('fo_capacitacion__fo_curso').annotate(n=Count('id')).values('n'))
    avance = (ProgresoCurso.objects.filter(fo_curso=OuterRef('pk'))
              .values('fo_curso').annotate(promedio=Avg('porcentaje')).values('promedio'))
    ordenados = cursos.annotate(inscritos=Subquery(inscritos), avance=Subquery(avance)).order_by(
        F('inscritos').desc(nulls_last=True), 'titulo')

    items = [
        item_lista(c.titulo, f'{c.inscritos or 0} inscrito(s) · avance promedio {round(c.avance or 0)}%', c.estado, '/capacitacion')
        for c in ordenados[:MAX_ITEMS_LISTA]
    ]
    return tarjeta_lista('cursos_y_aprendices', 'Cursos y aprendices', items, cursos.count(), '/capacitacion')


def documentos_recientes(usuario):
    """Últimos documentos de la biblioteca. El modelo no tiene estado "por revisar": se listan los más recientes."""
    documentos = Documento.objects.all()
    recientes = documentos.select_related('fo_tipo_documento', 'fo_categoria_documento').order_by('-fecha_creacion', '-id')[:MAX_ITEMS_LISTA]
    items = [
        item_lista(d.titulo, f'{d.fo_tipo_documento.nombre_tipo} · versión {d.version} · {d.fecha_creacion:%d/%m/%Y}',
                   d.fo_categoria_documento.nombre_categoria, '/documentos')
        for d in recientes
    ]
    return tarjeta_lista('documentos_recientes', 'Documentos recientes', items, documentos.count(), '/documentos')


def personal_y_capacitacion(usuario):
    """Empleados activos e inscripciones a capacitaciones (en curso: la capacitación no ha terminado;
    completadas: terminó y el empleado asistió)."""
    hoy = timezone.localdate()
    inscripciones = ParticipanteCapacitacion.objects.aggregate(
        en_curso=Count('id', filter=Q(fo_capacitacion__fecha_fin__gte=hoy)),
        completadas=Count('id', filter=Q(fo_capacitacion__fecha_fin__lt=hoy, asistio=True)),
    )
    return tarjeta_metricas('personal_capacitacion', 'Personal y capacitación', [
        metrica('Empleados activos', Empleado.objects.filter(fo_usuario__is_active=True).count(), '/usuarios'),
        metrica('Inscripciones en curso', inscripciones['en_curso'], '/capacitacion'),
        metrica('Inscripciones completadas', inscripciones['completadas'], '/capacitacion'),
    ])
