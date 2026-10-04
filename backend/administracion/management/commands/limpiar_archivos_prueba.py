import os

from django.apps import apps
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import FileField, ProtectedError

# Archivos de ejemplo reales que nunca se tocan (se compara el nombre sin el sufijo que añade Django al repetirse).
PROTEGIDOS = ('asistencia_marzo', 'inventario_marzo', 'ventas_enero', 'ventas_febrero')


class Command(BaseCommand):
    help = (
        'Busca registros cuyo archivo pesa pocos bytes (restos de pruebas) y los elimina junto con el archivo. '
        'Por defecto solo simula: muestra qué borraría. Borra de verdad con --confirmar.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--confirmar', action='store_true', help='Elimina de verdad los registros y archivos listados.')
        parser.add_argument('--huerfanos', action='store_true', help='Además, lista (o borra con --confirmar) los archivos diminutos de media/ que ningún registro referencia.')
        parser.add_argument('--max-bytes', type=int, default=3, help='Tamaño máximo (en bytes) para considerar un archivo de prueba. Por defecto 3.')

    def _candidatos(self, max_bytes):
        for modelo in apps.get_models():
            for campo in modelo._meta.get_fields():
                if not isinstance(campo, FileField):
                    continue
                for objeto in modelo.objects.exclude(**{campo.name: ''}).exclude(**{f'{campo.name}__isnull': True}):
                    archivo = getattr(objeto, campo.name)
                    ruta = archivo.path if archivo else None
                    if not ruta or not os.path.isfile(ruta):
                        continue
                    nombre = os.path.basename(ruta).lower()
                    if nombre.startswith(PROTEGIDOS):
                        continue
                    tamano = os.path.getsize(ruta)
                    if tamano <= max_bytes:
                        yield modelo, objeto, campo.name, ruta, tamano

    def _huerfanos(self, max_bytes):
        raiz = os.path.realpath(settings.MEDIA_ROOT)
        referenciados = set()
        for modelo in apps.get_models():
            for campo in modelo._meta.get_fields():
                if isinstance(campo, FileField):
                    for nombre in modelo.objects.exclude(**{campo.name: ''}).values_list(campo.name, flat=True):
                        if nombre:
                            referenciados.add(os.path.normcase(os.path.realpath(os.path.join(raiz, nombre))))
        for carpeta, _, archivos in os.walk(raiz):
            for archivo in archivos:
                ruta = os.path.join(carpeta, archivo)
                if archivo.lower().startswith(PROTEGIDOS) or os.path.normcase(os.path.realpath(ruta)) in referenciados:
                    continue
                if os.path.getsize(ruta) <= max_bytes:
                    yield ruta

    def handle(self, *args, **options):
        confirmar = options['confirmar']
        candidatos = list(self._candidatos(options['max_bytes']))
        etiqueta = 'SE ELIMINA' if confirmar else 'se eliminaría'
        for modelo, objeto, campo, ruta, tamano in candidatos:
            self.stdout.write(f'[{etiqueta}] {modelo._meta.label} id={objeto.pk} {campo}={ruta} ({tamano} B)')

        huerfanos = list(self._huerfanos(options['max_bytes'])) if options['huerfanos'] else []
        for ruta in huerfanos:
            self.stdout.write(f'[{etiqueta}] archivo huérfano {ruta}')

        if not confirmar:
            self.stdout.write(self.style.WARNING(
                f'Simulación: {len(huerfanos)} archivo(s) huérfano(s) aparte. ' if options['huerfanos'] else ''
            ) + self.style.WARNING(
                f'Simulación: {len(candidatos)} registro(s). No se borró nada; usa --confirmar para eliminarlos.'))
            return

        borrados = omitidos = 0
        for modelo, objeto, campo, ruta, _ in candidatos:
            try:
                with transaction.atomic():
                    objeto.delete()
            except ProtectedError:
                omitidos += 1
                self.stdout.write(self.style.ERROR(f'[omitido: tiene datos que lo protegen] {modelo._meta.label} id={objeto.pk}'))
                continue
            if os.path.isfile(ruta):
                os.remove(ruta)
            borrados += 1
        for ruta in huerfanos:
            os.remove(ruta)
        self.stdout.write(self.style.SUCCESS(f'Eliminados {len(huerfanos)} archivo(s) huérfano(s). '))
        self.stdout.write(self.style.SUCCESS(f'Eliminados {borrados} registro(s) con su archivo; omitidos {omitidos}.'))
