"""Exportador PDF (reportlab). Recibe el dict de contenido y devuelve bytes."""
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .comun import NAVY, columnas_maximas, cortar, fecha_generado, formatear

COLOR_NAVY = colors.HexColor('#' + NAVY)
COLORES_SERIES = [colors.HexColor('#0b1f3a'), colors.HexColor('#1a56db'), colors.HexColor('#7a8aa6'), colors.HexColor('#c0392b')]

_base = getSampleStyleSheet()
ESTILO_TITULO = ParagraphStyle('t', parent=_base['Title'], textColor=COLOR_NAVY, fontSize=20, alignment=0, spaceAfter=2)
ESTILO_SUBTITULO = ParagraphStyle('s', parent=_base['Normal'], textColor=colors.HexColor('#5a6380'), fontSize=10, spaceAfter=10)
ESTILO_SECCION = ParagraphStyle('h', parent=_base['Heading2'], textColor=COLOR_NAVY, fontSize=13, spaceBefore=12, spaceAfter=4)
ESTILO_CELDA = ParagraphStyle('c', parent=_base['Normal'], fontSize=8, leading=10)
ESTILO_ENCABEZADO = ParagraphStyle('e', parent=ESTILO_CELDA, textColor=colors.white, fontName='Helvetica-Bold')
ESTILO_NOTA = ParagraphStyle('n', parent=_base['Normal'], fontSize=8, textColor=colors.HexColor('#5a6380'), spaceBefore=3)


def _p(texto, estilo=ESTILO_CELDA):
    # Paragraph interpreta marcado: siempre se escapa & < > de cualquier texto externo.
    return Paragraph(escape(formatear(texto)), estilo)


def _tabla(columnas, filas, ancho_total):
    datos = [[_p(c, ESTILO_ENCABEZADO) for c in columnas]] + [[_p(v) for v in fila] for fila in filas]
    tabla = Table(datos, colWidths=[ancho_total / max(len(columnas), 1)] * len(columnas), repeatRows=1)
    tabla.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COLOR_NAVY),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f4f6fb')]),
        ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#c8cfdf')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4), ('RIGHTPADDING', (0, 0), (-1, -1), 4),
    ]))
    return tabla


def _grafico(grafico, ancho):
    etiquetas = [cortar(e, 18) for e in grafico['etiquetas']]
    series = grafico['series']
    dibujo = Drawing(ancho, 200)
    barras = VerticalBarChart()
    barras.x, barras.y, barras.width, barras.height = 40, 55, ancho - 60, 130
    barras.data = [[float(v) for v in s['valores']] for s in series]
    barras.categoryAxis.categoryNames = etiquetas
    barras.categoryAxis.labels.angle = 30
    barras.categoryAxis.labels.boxAnchor = 'ne'
    barras.categoryAxis.labels.fontSize = 7
    barras.valueAxis.labels.fontSize = 7
    barras.valueAxis.valueMin = 0
    for i in range(len(series)):
        barras.bars[i].fillColor = COLORES_SERIES[i % len(COLORES_SERIES)]
    dibujo.add(barras)
    elementos = [Paragraph(escape(cortar(grafico['titulo'])), ESTILO_SECCION), dibujo]
    if len(series) > 1:
        leyenda = ', '.join(f'{escape(cortar(s["nombre"], 30))}' for s in series)
        elementos.append(Paragraph('Series: ' + leyenda, ESTILO_NOTA))
    return KeepTogether(elementos)


def exportar(contenido):
    horizontal = columnas_maximas(contenido) > 6
    tamano = landscape(A4) if horizontal else A4
    ancho_util = tamano[0] - 3 * cm
    titulo = cortar(contenido.get('titulo', 'Informe'), 150)

    def pie(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#5a6380'))
        canvas.drawString(1.5 * cm, 1 * cm, f'TRAINET — {titulo[:80]}')
        canvas.drawRightString(tamano[0] - 1.5 * cm, 1 * cm, f'Página {doc.page}')
        canvas.restoreState()

    historia = [
        Paragraph('TRAINET — ' + escape(titulo), ESTILO_TITULO),
        Paragraph(escape(cortar(contenido.get('subtitulo', ''))) + ' · Generado el ' + escape(fecha_generado(contenido)),
                  ESTILO_SUBTITULO),
    ]

    indicadores = contenido.get('indicadores', [])
    if indicadores:
        historia.append(_tabla(['Indicador', 'Valor'], [[i['etiqueta'], i['valor']] for i in indicadores], ancho_util))

    for sec in contenido.get('secciones', []):
        historia.append(Paragraph(escape(cortar(sec['titulo'])), ESTILO_SECCION))
        if sec['filas']:
            historia.append(_tabla(sec['columnas'], sec['filas'], ancho_util))
        else:
            historia.append(Paragraph('Sin datos.', ESTILO_NOTA))
        if sec.get('nota'):
            historia.append(Paragraph(escape(cortar(sec['nota'], 300)), ESTILO_NOTA))

    for graf in contenido.get('graficos', []):
        if graf['etiquetas']:
            historia.append(Spacer(1, 6))
            historia.append(_grafico(graf, ancho_util))

    salida = BytesIO()
    documento = SimpleDocTemplate(salida, pagesize=tamano, leftMargin=1.5 * cm, rightMargin=1.5 * cm,
                                  topMargin=1.5 * cm, bottomMargin=1.8 * cm, title=titulo, author='TRAINET')
    documento.build(historia, onFirstPage=pie, onLaterPages=pie)
    return salida.getvalue()
