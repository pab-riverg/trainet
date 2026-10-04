"""Utilidades compartidas por los exportadores. Todos consumen solo el dict de contenido."""
import re
from datetime import datetime

NAVY = '0b1f3a'
MAX_CELDA = 120
_CONTROL = re.compile(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]')


def limpiar(valor):
    """Texto seguro: sin caracteres de control (rompen XML/Excel) y sin espacios sobrantes."""
    return _CONTROL.sub('', str(valor)).strip()


def cortar(texto, maximo=MAX_CELDA):
    texto = limpiar(texto)
    return texto if len(texto) <= maximo else texto[:maximo - 1] + '…'


def es_numero(valor):
    return isinstance(valor, (int, float)) and not isinstance(valor, bool)


def formatear(valor):
    """Texto para PDF/Word: miles con punto y decimales con coma (convención de la plataforma)."""
    if valor is None:
        return ''
    if es_numero(valor):
        if isinstance(valor, float) and not valor.is_integer():
            texto = f'{valor:,.2f}'
        else:
            texto = f'{int(valor):,}'
        return texto.replace(',', '§').replace('.', ',').replace('§', '.')
    return cortar(valor)


def fecha_generado(contenido):
    try:
        return datetime.fromisoformat(contenido.get('generado_en', '')).strftime('%d/%m/%Y %H:%M')
    except ValueError:
        return ''


def columnas_maximas(contenido):
    return max([len(s['columnas']) for s in contenido.get('secciones', [])] or [0])
