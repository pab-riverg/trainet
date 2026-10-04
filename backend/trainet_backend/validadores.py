"""Validadores de formato compartidos (teléfono, cédula y NIT). Única fuente de verdad de los formatos.

Se aplican en los SERIALIZERS (no en los modelos) para no romper filas antiguas ni el admin de Django.
Todos lanzan serializers.ValidationError con mensajes en español.
"""
import re

from rest_framework import serializers

# --- Teléfono: formato canónico "+<prefijo> <número>" (E.164 con un espacio) ---
# Ejemplo válido: "+57 3001234567".
PREFIJO_TELEFONO_MIN, PREFIJO_TELEFONO_MAX = 1, 3
NUMERO_TELEFONO_MIN, NUMERO_TELEFONO_MAX = 7, 12
# E.164: el total de dígitos (prefijo + número) no supera 15. Con los límites anteriores siempre se cumple.
TELEFONO_MAX_DIGITOS_TOTALES = 15
PATRON_TELEFONO = re.compile(
    rf'^\+(\d{{{PREFIJO_TELEFONO_MIN},{PREFIJO_TELEFONO_MAX}}}) (\d{{{NUMERO_TELEFONO_MIN},{NUMERO_TELEFONO_MAX}}})$'
)
PREFIJO_POR_DEFECTO = '+57'

# --- Cédula: solo dígitos, de 6 a 10 ---
CEDULA_MIN, CEDULA_MAX = 6, 10
PATRON_CEDULA = re.compile(rf'^\d{{{CEDULA_MIN},{CEDULA_MAX}}}$')

# --- NIT: solo dígitos, de 7 a 10 (incluye el dígito de verificación) ---
NIT_MIN, NIT_MAX = 7, 10
PATRON_NIT = re.compile(rf'^\d{{{NIT_MIN},{NIT_MAX}}}$')

EJEMPLO_TELEFONO = '+57 3001234567'


def telefono_es_canonico(valor):
    """True si el texto ya cumple el formato canónico (sin recortar nada)."""
    coincidencia = PATRON_TELEFONO.match(valor)
    return bool(coincidencia) and len(coincidencia.group(1)) + len(coincidencia.group(2)) <= TELEFONO_MAX_DIGITOS_TOTALES


def validar_telefono(valor):
    """Recorta los extremos y valida el formato. Devuelve el teléfono limpio; '' se acepta (campo opcional)."""
    valor = (valor or '').strip()
    if not valor:
        return ''
    if telefono_es_canonico(valor):
        return valor
    if not valor.startswith('+'):
        raise serializers.ValidationError(f'El teléfono debe empezar con + y el prefijo del país. Ejemplo: {EJEMPLO_TELEFONO}.')
    if re.search(r'[A-Za-zÁ-ú]', valor):
        raise serializers.ValidationError('El teléfono no puede contener letras.')
    if not re.match(r'^\+\d{1,}( \d+)?$', valor) or ' ' not in valor:
        raise serializers.ValidationError(f'Escribe el prefijo, un espacio y el número, sin otros símbolos. Ejemplo: {EJEMPLO_TELEFONO}.')
    prefijo, numero = valor[1:].split(' ', 1)
    if len(prefijo) > PREFIJO_TELEFONO_MAX:
        raise serializers.ValidationError(f'El prefijo del país debe tener de {PREFIJO_TELEFONO_MIN} a {PREFIJO_TELEFONO_MAX} dígitos.')
    if not re.match(r'^\d+$', numero):
        raise serializers.ValidationError(f'El número solo puede tener dígitos, sin espacios ni símbolos. Ejemplo: {EJEMPLO_TELEFONO}.')
    raise serializers.ValidationError(f'El número debe tener de {NUMERO_TELEFONO_MIN} a {NUMERO_TELEFONO_MAX} dígitos.')


def validar_cedula(valor):
    """Devuelve la cédula limpia, o None si viene vacía (campo opcional)."""
    valor = (valor or '').strip() if isinstance(valor, str) or valor is None else str(valor)
    if not valor:
        return None
    if not PATRON_CEDULA.match(valor):
        raise serializers.ValidationError(f'La cédula debe tener solo dígitos, de {CEDULA_MIN} a {CEDULA_MAX}.')
    return valor


def validar_nit(valor):
    """Devuelve el NIT limpio (solo dígitos, con el dígito de verificación)."""
    valor = (valor or '').strip()
    if not valor:
        raise serializers.ValidationError('El NIT es obligatorio.')
    if not PATRON_NIT.match(valor):
        raise serializers.ValidationError(
            f'El NIT debe tener solo dígitos, de {NIT_MIN} a {NIT_MAX}, sin puntos ni guiones (incluye el dígito de verificación).'
        )
    return valor
