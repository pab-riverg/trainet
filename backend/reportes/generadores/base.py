"""Utilidades comunes de los generadores. Todos devuelven el mismo dict de contenido (ver contenido())."""
from datetime import datetime, time, timedelta

from django.db.models import Count
from django.utils import timezone

MAX_FILAS_SECCION = 500


def formato_fecha(fecha):
    return fecha.strftime('%d/%m/%Y')


def limites(desde, hasta):
    """Rango inclusivo por fecha local -> (inicio, fin_exclusivo) aware, para campos DateTimeField.

    Evita CONVERT_TZ de MySQL (que exige tablas de zonas horarias cargadas).
    """
    zona = timezone.get_current_timezone()
    inicio = timezone.make_aware(datetime.combine(desde, time.min), zona)
    fin = timezone.make_aware(datetime.combine(hasta + timedelta(days=1), time.min), zona)
    return inicio, fin


def etiquetas(modelo, campo):
    """Lista de (codigo, etiqueta) de un campo con choices, en el orden definido."""
    return list(modelo._meta.get_field(campo).choices)


def conteo_por(queryset, campo):
    """{valor: total} agregando en la base de datos."""
    return {fila[campo]: fila['total'] for fila in queryset.values(campo).annotate(total=Count('id'))}


def porcentaje(parte, total):
    return round(parte * 100 / total, 1) if total else 0


def seccion(titulo, columnas, filas, nota=None):
    """Sección con tope de 500 filas; si se recorta lo dice en la nota."""
    filas = [list(f) for f in filas]
    total = len(filas)
    if total > MAX_FILAS_SECCION:
        filas = filas[:MAX_FILAS_SECCION]
        nota = f'Se muestran las primeras {MAX_FILAS_SECCION} de {total} filas.'
    return {'titulo': titulo, 'columnas': list(columnas), 'filas': filas, 'nota': nota}


def seccion_total_conocido(titulo, columnas, filas, total, nota=None):
    """Igual que seccion(), cuando las filas ya vienen recortadas de la base y se conoce el total real."""
    filas = [list(f) for f in filas]
    if total > len(filas):
        nota = f'Se muestran las primeras {len(filas)} de {total} filas.'
    return {'titulo': titulo, 'columnas': list(columnas), 'filas': filas, 'nota': nota}


def grafico_barras(titulo, etiquetas_, series):
    """series: [(nombre, [valores])]."""
    return {'titulo': titulo, 'tipo': 'barras', 'etiquetas': [str(e) for e in etiquetas_],
            'series': [{'nombre': n, 'valores': list(v)} for n, v in series]}


def contenido(titulo, desde, hasta, indicadores, secciones, graficos=None, nota_vacio=None, hay_datos=True):
    """Arma el dict de contenido. Si no hay datos añade una nota explicativa a la primera sección."""
    if not hay_datos and secciones:
        secciones[0]['nota'] = secciones[0]['nota'] or (nota_vacio or 'No hay datos en el rango seleccionado.')
    return {
        'titulo': titulo,
        'subtitulo': f'Del {formato_fecha(desde)} al {formato_fecha(hasta)}',
        'generado_en': timezone.now().isoformat(),
        'indicadores': [{'etiqueta': e, 'valor': v} for e, v in indicadores],
        'secciones': secciones,
        'graficos': graficos or [],
    }

