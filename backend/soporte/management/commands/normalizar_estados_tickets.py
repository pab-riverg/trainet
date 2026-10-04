"""Lleva el estado y la prioridad de los tickets a su valor canónico (por ejemplo 'en proceso' -> 'en_proceso').

Algunos tickets antiguos se guardaron con el texto escrito a mano. Solo informa por defecto (dry-run); con
--aplicar escribe. Es idempotente: una segunda corrida no cambia nada. Los valores que no se reconocen se listan
y no se tocan.
"""
import unicodedata
from collections import Counter

from django.core.management.base import BaseCommand

from soporte.models import TicketSoporte


def clave(valor):
    """Minúsculas, sin tildes ni espacios sobrantes y con '_' entre palabras."""
    sin_tildes = ''.join(c for c in unicodedata.normalize('NFD', str(valor).strip().lower()) if unicodedata.category(c) != 'Mn')
    return '_'.join(sin_tildes.replace('-', ' ').split())


class Command(BaseCommand):
    help = 'Normaliza estado y prioridad de los tickets al valor canónico (dry-run por defecto).'

    def add_arguments(self, parser):
        parser.add_argument('--aplicar', action='store_true', help='Escribe los cambios (sin esto solo informa).')

    def handle(self, *args, **opciones):
        aplicar = opciones['aplicar']
        campos = {
            'estado': {c for c, _ in TicketSoporte.ESTADO_CHOICES},
            'prioridad': {c for c, _ in TicketSoporte.PRIORIDAD_CHOICES},
        }
        cambios = Counter()
        sin_reconocer = Counter()

        for ticket in TicketSoporte.objects.only('id', *campos):
            nuevos = {}
            for campo, validos in campos.items():
                actual = getattr(ticket, campo)
                if actual in validos:
                    continue
                canonico = clave(actual)
                if canonico in validos:
                    nuevos[campo] = canonico
                    cambios[(campo, actual, canonico)] += 1
                else:
                    sin_reconocer[(campo, actual)] += 1
            if nuevos and aplicar:
                TicketSoporte.objects.filter(pk=ticket.pk).update(**nuevos)

        self.stdout.write('APLICADO' if aplicar else 'DRY-RUN (usa --aplicar para escribir)')
        self.stdout.write(f'Tickets a normalizar: {sum(cambios.values())}')
        for (campo, antes, despues), total in sorted(cambios.items()):
            self.stdout.write(f'  {campo}: {antes!r} -> {despues!r} ({total})')
        if sin_reconocer:
            self.stdout.write('Valores no reconocidos (no se tocan):')
            for (campo, valor), total in sorted(sin_reconocer.items()):
                self.stdout.write(f'  {campo}: {valor!r} ({total})')
