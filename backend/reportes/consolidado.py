"""Informe consolidado de varios archivos importados.

Regla para interpretar números (texto de celda -> float), aplicada por `a_numero`:
  1. Se ignoran espacios, símbolos de moneda ($ € £ ¥) y el signo %.
  2. Solo se aceptan dígitos, '.', ',' y un signo + o - inicial.
  3. Si hay '.' y ',' el último que aparece es el separador decimal y el otro, de miles ("1.234,56" y "1,234.56").
  4. Si solo hay ',': es decimal ("1,5"), salvo que lo que sigue a la coma sean exactamente 3 dígitos
     (entonces es separador de miles: "1,234" = 1234). Con varias comas deben ser todas de miles.
  5. Si solo hay '.': es decimal ("2.000" = 2.0). Con varios puntos deben ser todos de miles ("1.234.567").
Una columna es numérica si al menos el 80 % de sus celdas no vacías se interpretan como número.
"""
import re
import unicodedata
from collections import defaultdict

from . import importacion
from .generadores.base import contenido, grafico_barras, seccion

MIN_ARCHIVOS = 2
MAX_ARCHIVOS = 20
MAX_FILAS_TOTALES = 200000
UMBRAL_NUMERICA = 0.8
MAX_ARCHIVOS_GRAFICO = 8

_SIMBOLOS = re.compile(r'[\s $€£¥%]')
_VALIDO = re.compile(r'^[+-]?[\d.,]*\d[\d.,]*$')


class ErrorConsolidado(Exception):
    """Selección de archivos no válida; el mensaje se muestra tal cual al usuario."""


def a_numero(texto):
    """Interpreta un texto como número según la regla del módulo; None si no es un número."""
    limpio = _SIMBOLOS.sub('', texto or '')
    if not limpio or not _VALIDO.match(limpio):
        return None
    signo = -1 if limpio[0] == '-' else 1
    limpio = limpio.lstrip('+-')
    if not limpio:
        return None
    tiene_punto, tiene_coma = '.' in limpio, ',' in limpio
    if tiene_punto and tiene_coma:
        decimal = '.' if limpio.rfind('.') > limpio.rfind(',') else ','
        miles = ',' if decimal == '.' else '.'
        if limpio.count(decimal) != 1:
            return None
        limpio = limpio.replace(miles, '').replace(decimal, '.')
    elif tiene_coma:
        partes = limpio.split(',')
        if len(partes) > 2 or (len(partes) == 2 and len(partes[1]) == 3 and partes[0]):
            if not all(len(p) == 3 for p in partes[1:]) or not partes[0]:
                return None
            limpio = ''.join(partes)
        else:
            limpio = limpio.replace(',', '.')
    elif tiene_punto:
        partes = limpio.split('.')
        if len(partes) > 2:
            if not all(len(p) == 3 for p in partes[1:]) or not partes[0]:
                return None
            limpio = ''.join(partes)
    try:
        return signo * float(limpio)
    except ValueError:
        return None


def clave_columna(nombre):
    """Nombre normalizado para comparar columnas: sin mayúsculas, tildes ni espacios repetidos."""
    sin_tildes = ''.join(c for c in unicodedata.normalize('NFD', nombre) if unicodedata.category(c) != 'Mn')
    return ' '.join(sin_tildes.lower().split())


def validar_seleccion(archivos):
    if len(archivos) < MIN_ARCHIVOS:
        raise ErrorConsolidado(f'Selecciona al menos {MIN_ARCHIVOS} archivos para consolidar.')
    if len(archivos) > MAX_ARCHIVOS:
        raise ErrorConsolidado(f'Puedes consolidar como máximo {MAX_ARCHIVOS} archivos a la vez.')
    archivados = [a.titulo for a in archivos if not a.activo]
    if archivados:
        raise ErrorConsolidado('Solo se pueden consolidar archivos activos. Archivados: ' + ', '.join(archivados) + '.')
    if sum(a.filas for a in archivos) > MAX_FILAS_TOTALES:
        raise ErrorConsolidado(f'Los archivos suman más de {MAX_FILAS_TOTALES} filas; selecciona menos archivos.')


def _analizar_archivo(archivo):
    """{clave: {'nombre', 'valores': [float]}} solo con las columnas numéricas, más las claves de todas las columnas."""
    with archivo.archivo.open('rb') as f:
        contenido_bytes = f.read()
    encabezados, filas, _ = importacion.leer(contenido_bytes, archivo.formato)
    columnas, numericas = {}, {}
    for i, nombre in enumerate(encabezados):
        celdas = [fila[i] for fila in filas if fila[i] != '']
        columnas[clave_columna(nombre)] = nombre
        if not celdas:
            continue
        numeros = [n for n in (a_numero(c) for c in celdas) if n is not None]
        if len(numeros) / len(celdas) >= UMBRAL_NUMERICA:
            numericas[clave_columna(nombre)] = numeros
    return columnas, numericas


def _redondear(valor):
    return round(valor, 2)


def construir(archivos, titulo=None):
    """Devuelve el dict de contenido del consolidado. Lanza ErrorConsolidado si la selección no es válida."""
    validar_seleccion(archivos)

    analisis = []  # (archivo, columnas {clave: nombre}, numericas {clave: [floats]})
    for archivo in archivos:
        try:
            columnas, numericas = _analizar_archivo(archivo)
        except importacion.ErrorImportacion as error:
            raise ErrorConsolidado(f'No se pudo leer "{archivo.titulo}": {error}')
        except (FileNotFoundError, ValueError):
            raise ErrorConsolidado(f'El archivo "{archivo.titulo}" no está disponible en el servidor.')
        analisis.append((archivo, columnas, numericas))

    # Columnas comunes: mismo nombre normalizado en >= 2 archivos.
    presencia = defaultdict(int)
    nombre_visible = {}
    for _, columnas, _ in analisis:
        for clave, nombre in columnas.items():
            presencia[clave] += 1
            nombre_visible.setdefault(clave, nombre)
    comunes = sorted(c for c, n in presencia.items() if n >= 2)

    filas_totales = sum(a.filas for a in archivos)
    fechas = sorted(a.fecha_documento for a in archivos)

    # --- Resumen por archivo
    filas_resumen = [[a.titulo, a.fo_tipo.nombre_tipo, a.fecha_documento.strftime('%d/%m/%Y'), a.filas, a.columnas]
                     for a in archivos]

    # --- Totales por columna común (solo las que son numéricas en al menos un archivo)
    filas_comunes, numericas_comunes = [], []
    for clave in comunes:
        valores = [v for _, _, num in analisis for v in num.get(clave, [])]
        if not valores:
            continue
        en_archivos = sum(1 for _, _, num in analisis if clave in num)
        numericas_comunes.append((clave, en_archivos))
        filas_comunes.append([nombre_visible[clave], presencia[clave], _redondear(sum(valores)),
                              _redondear(sum(valores) / len(valores)), _redondear(min(valores)),
                              _redondear(max(valores)), len(valores)])

    # Columna numérica común "principal": la numérica en más archivos (desempate alfabético).
    principal = None
    if numericas_comunes:
        principal = sorted(numericas_comunes, key=lambda par: (-par[1], par[0]))[0][0]

    # --- Totales por tipo
    por_tipo = defaultdict(lambda: {'archivos': 0, 'filas': 0, 'suma': 0.0})
    for archivo, _, num in analisis:
        t = por_tipo[archivo.fo_tipo.nombre_tipo]
        t['archivos'] += 1
        t['filas'] += archivo.filas
        if principal:
            t['suma'] += sum(num.get(principal, []))
    columnas_tipo = ['Tipo', 'Archivos', 'Filas'] + ([f'Suma de {nombre_visible[principal]}'] if principal else [])
    filas_tipo = [[nombre, t['archivos'], t['filas']] + ([_redondear(t['suma'])] if principal else [])
                  for nombre, t in sorted(por_tipo.items())]

    # --- Gráficos
    graficos = []
    por_filas = sorted(archivos, key=lambda a: (-a.filas, a.titulo))[:MAX_ARCHIVOS_GRAFICO]
    graficos.append(grafico_barras('Filas por archivo', [a.titulo for a in por_filas], [('Filas', [a.filas for a in por_filas])]))
    if principal:
        sumas = sorted(((a.titulo, _redondear(sum(num.get(principal, [])))) for a, _, num in analisis),
                       key=lambda par: (-par[1], par[0]))[:MAX_ARCHIVOS_GRAFICO]
        graficos.append(grafico_barras(f'Suma de {nombre_visible[principal]} por archivo',
                                       [t for t, _ in sumas], [('Suma', [v for _, v in sumas])]))

    rango = (f'{fechas[0].strftime("%d/%m/%Y")} - {fechas[-1].strftime("%d/%m/%Y")}'
             if fechas[0] != fechas[-1] else fechas[0].strftime('%d/%m/%Y'))
    informe = contenido(
        titulo or f'Consolidado de {len(archivos)} archivos', fechas[0], fechas[-1],
        indicadores=[
            ('Archivos incluidos', len(archivos)),
            ('Filas totales', filas_totales),
            ('Columnas comunes', len(comunes)),
            ('Fechas de los documentos', rango),
        ],
        secciones=[
            seccion('Resumen por archivo', ['Archivo', 'Tipo', 'Fecha del documento', 'Filas', 'Columnas'], filas_resumen),
            seccion('Totales por columna común',
                    ['Columna', 'Archivos', 'Suma', 'Promedio', 'Mínimo', 'Máximo', 'Valores'], filas_comunes,
                    nota=None if filas_comunes else 'Los archivos no comparten columnas numéricas.'),
            seccion('Totales por tipo', columnas_tipo, filas_tipo),
        ],
        graficos=graficos,
    )
    informe['subtitulo'] = f'{len(archivos)} archivos · documentos del {rango}'
    return informe
