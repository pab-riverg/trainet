import re

from django.core.management.base import BaseCommand
from django.db import transaction

from proveedores.models import Proveedor
from trainet_backend.validadores import (
    NIT_MAX, NIT_MIN, NUMERO_TELEFONO_MAX, NUMERO_TELEFONO_MIN, PREFIJO_POR_DEFECTO, telefono_es_canonico,
)
from usuarios.models import Usuario

_SEPARADORES_TELEFONO = re.compile(r'[\s\-().]')
_SEPARADORES_NIT = re.compile(r'[\s.\-]')


def convertir_telefono(valor):
    """Teléfono canónico si la conversión es segura; None si no se puede (o si ya estaba bien)."""
    if telefono_es_canonico(valor):
        return None
    limpio = _SEPARADORES_TELEFONO.sub('', valor)
    if limpio.isdigit() and NUMERO_TELEFONO_MIN <= len(limpio) <= NUMERO_TELEFONO_MAX:
        # Incluye el caso de 10 dígitos que empiezan por 3 (celular colombiano).
        return f'{PREFIJO_POR_DEFECTO} {limpio}'
    return None


def convertir_nit(valor):
    """NIT de solo dígitos si tenía puntos, guiones o espacios y quedan de 7 a 10 dígitos; None si no aplica."""
    if valor.isdigit() or not _SEPARADORES_NIT.search(valor):
        return None
    limpio = _SEPARADORES_NIT.sub('', valor)
    return limpio if limpio.isdigit() and NIT_MIN <= len(limpio) <= NIT_MAX else None


class Command(BaseCommand):
    help = ('Reporta (y con --aplicar convierte) teléfonos y NIT al formato canónico. '
            'Solo convierte lo seguro; lo dudoso se lista y no se toca. Es idempotente.')

    def add_arguments(self, parser):
        parser.add_argument('--aplicar', action='store_true', help='Guarda las conversiones (sin esta opción solo reporta).')

    @transaction.atomic
    def handle(self, *args, **opciones):
        aplicar = opciones['aplicar']
        convertidos, dudosos = 0, 0

        trabajos = [
            ('Usuario', 'teléfono', Usuario.objects.exclude(telefono=''), 'telefono', convertir_telefono,
             lambda v: not telefono_es_canonico(v), lambda u: f'usuario #{u.pk}'),
            ('Proveedor', 'teléfono', Proveedor.objects.all(), 'telefono', convertir_telefono,
             lambda v: not telefono_es_canonico(v), lambda p: f'proveedor #{p.pk}'),
            ('Proveedor', 'NIT (campo rut)', Proveedor.objects.all(), 'rut', convertir_nit,
             lambda v: not (v.isdigit() and NIT_MIN <= len(v) <= NIT_MAX), lambda p: f'proveedor #{p.pk}'),
        ]
        for modelo, nombre, queryset, campo, convertir, es_irregular, etiqueta in trabajos:
            for fila in queryset.order_by('pk'):
                actual = getattr(fila, campo) or ''
                if not es_irregular(actual):
                    continue
                nuevo = convertir(actual)
                # Los valores no se imprimen: son datos personales. Solo el tipo de dato y el id.
                if nuevo is None:
                    dudosos += 1
                    self.stdout.write(self.style.WARNING(f'[dudoso] {modelo} {nombre}: {etiqueta(fila)} no se puede convertir con seguridad (revisar a mano).'))
                    continue
                convertidos += 1
                if aplicar:
                    type(fila).objects.filter(pk=fila.pk).update(**{campo: nuevo})
                    self.stdout.write(self.style.SUCCESS(f'[convertido] {modelo} {nombre}: {etiqueta(fila)}.'))
                else:
                    self.stdout.write(f'[se convertiría] {modelo} {nombre}: {etiqueta(fila)}.')

        modo = 'aplicado' if aplicar else 'simulación (no se modificó nada; usa --aplicar para guardar)'
        self.stdout.write(self.style.SUCCESS(f'Resumen ({modo}): {convertidos} convertibles, {dudosos} dudosos.'))
