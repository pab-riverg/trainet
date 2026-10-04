"""Asigna `ruta` a las notificaciones antiguas (ruta vacía) infiriéndola del texto del mensaje.

Usa el MISMO mapeo que las notificaciones nuevas (notificaciones/rutas.py). Por defecto solo informa (dry-run);
con --aplicar escribe. Es idempotente: solo toca las que siguen sin ruta. No modifica `leida` ni el mensaje.
"""
import re
from collections import Counter

from django.core.management.base import BaseCommand

from notificaciones.models import Notificacion
from notificaciones.rutas import DESTINOS, evento_de_mensaje, ruta_de_evento, ruta_valida


def patron_de_mensaje(mensaje):
    """Mensaje sin datos variables (números y textos entre comillas) para agrupar los no reconocidos."""
    return re.sub(r'#?\d+', '#', re.sub(r'"[^"]*"', '"…"', mensaje))


class Command(BaseCommand):
    help = 'Asigna la ruta de destino a las notificaciones antiguas sin ruta (dry-run por defecto).'

    def add_arguments(self, parser):
        parser.add_argument('--aplicar', action='store_true', help='Escribe los cambios (sin esto solo informa).')

    def handle(self, *args, **opciones):
        aplicar = opciones['aplicar']
        pendientes = Notificacion.objects.filter(ruta='').select_related('fo_usuario')
        por_modulo = Counter()
        sin_reconocer = Counter()
        asignadas = sin_destino = 0

        for notificacion in pendientes.iterator():
            evento = evento_de_mensaje(notificacion.mensaje)
            if evento is None:
                sin_reconocer[patron_de_mensaje(notificacion.mensaje)] += 1
                continue
            if DESTINOS[evento] is None:
                sin_destino += 1  # reconocida, pero a propósito no lleva a ningún módulo
                continue
            # La misma validación que notificar(): el rol actual del destinatario debe tener acceso al módulo.
            ruta = ruta_valida(ruta_de_evento(evento, notificacion.fo_usuario.rol), notificacion.fo_usuario)
            if not ruta:
                sin_destino += 1
                continue
            asignadas += 1
            por_modulo[ruta.split('?')[0]] += 1
            if aplicar:
                Notificacion.objects.filter(pk=notificacion.pk, ruta='').update(ruta=ruta)

        modo = 'APLICADO' if aplicar else 'DRY-RUN (usa --aplicar para escribir)'
        self.stdout.write(f'{modo}')
        self.stdout.write(f'Asignadas: {asignadas}')
        for modulo, total in sorted(por_modulo.items()):
            self.stdout.write(f'  {modulo}: {total}')
        self.stdout.write(f'Sin ruta (sin destino o sin acceso): {sin_destino}')
        self.stdout.write(f'Sin ruta (mensaje no reconocido): {sum(sin_reconocer.values())}')
        if sin_reconocer:
            self.stdout.write('Patrones no reconocidos:')
            for patron, total in sin_reconocer.most_common():
                self.stdout.write(f'  [{total}] {patron}')
