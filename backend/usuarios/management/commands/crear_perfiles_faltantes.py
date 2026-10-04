from django.core.management.base import BaseCommand

from usuarios.models import Supervisor, Usuario
from usuarios.perfiles import ROL_MODELOS_PERFIL


class Command(BaseCommand):
    help = (
        'Reporta (y, con --aplicar, crea) las filas de perfil faltantes '
        '(Empleado, Capacitador, etc.) de usuarios ya existentes.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--aplicar',
            action='store_true',
            help='Aplica los cambios. Sin esta bandera solo se reporta (dry-run).',
        )

    def handle(self, *args, **options):
        aplicar = options['aplicar']

        usuarios_sin_perfil = []
        for usuario in Usuario.objects.all().order_by('id'):
            modelo = ROL_MODELOS_PERFIL.get(usuario.rol)
            if modelo is None:
                continue
            if modelo.objects.filter(fo_usuario=usuario).exists():
                continue
            usuarios_sin_perfil.append((usuario, modelo))

        if not usuarios_sin_perfil:
            self.stdout.write(self.style.SUCCESS('Todos los usuarios tienen su perfil correspondiente.'))
            return

        self.stdout.write(f'Usuarios sin perfil: {len(usuarios_sin_perfil)}')

        primer_supervisor = Supervisor.objects.first()

        for usuario, modelo in usuarios_sin_perfil:
            self.stdout.write(f'- {usuario.email} (rol: {usuario.rol}) -> falta fila de {modelo.__name__}')

            if not aplicar:
                continue

            datos = {}
            if modelo.__name__ == 'Empleado':
                if primer_supervisor is None:
                    self.stdout.write(self.style.WARNING(
                        '  No se creó: no existe ningún Supervisor en el sistema.'
                    ))
                    continue
                datos = {
                    'puesto': 'Por definir',
                    'fecha_ingreso': usuario.fecha_registro,
                    'fo_supervisor': primer_supervisor,
                }
            elif modelo.__name__ == 'RecursosHumanos':
                datos = {'departamento': 'Por definir'}
            elif modelo.__name__ in ('Capacitador', 'TecnicoSoporte'):
                datos = {'especialidad_tecnica': 'Por definir'}

            modelo.objects.create(fo_usuario=usuario, **datos)
            self.stdout.write(self.style.SUCCESS(f'  Creado perfil de {modelo.__name__} para {usuario.email}.'))

        if not aplicar:
            self.stdout.write(self.style.WARNING(
                'Modo dry-run: no se realizaron cambios. Vuelve a ejecutar con --aplicar para crearlos.'
            ))
