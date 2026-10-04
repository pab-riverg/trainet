import secrets

from rest_framework import filters, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from administracion import auditoria
from notificaciones.utils import notificar

from .models import Capacitador, Empleado, Supervisor, TecnicoSoporte, Usuario
from .permissions import EsAdministrador, EsAdministradorOMismoUsuario, permiso_por_roles
from .serializers import (
    CambiarPasswordSerializer,
    CapacitadorSerializer,
    EmpleadoSerializer,
    SolicitarRecuperacionSerializer,
    SupervisorSerializer,
    TecnicoSoporteSerializer,
    UsuarioAutoeditarSerializer,
    UsuarioDetalleSerializer,
    UsuarioRegistroSerializer,
    UsuarioSerializer,
)


class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'email']

    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioRegistroSerializer
        if self.action == 'retrieve':
            return UsuarioDetalleSerializer
        if self.action in ['update', 'partial_update'] and self.request.user.rol != 'administrador':
            return UsuarioAutoeditarSerializer
        return UsuarioSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update']:
            permission_classes = [IsAuthenticated, EsAdministradorOMismoUsuario]
        elif self.action in ['create', 'destroy']:
            permission_classes = [IsAuthenticated, EsAdministrador]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        rol = self.request.query_params.get('rol')
        if rol:
            queryset = queryset.filter(rol=rol)
        return queryset

    def perform_create(self, serializer):
        usuario = serializer.save()
        auditoria.registrar(self.request.user, 'usuario_creado', 'usuarios',
                            f'Usuario creado: {usuario.email} (rol {usuario.rol})', self.request)

    def perform_update(self, serializer):
        rol_anterior = serializer.instance.rol
        cedula_anterior = serializer.instance.cedula
        usuario = serializer.save()
        # Nunca se guardan cédulas ni teléfonos en la bitácora: solo se indica que cambiaron.
        detalle = ', cédula actualizada' if usuario.cedula != cedula_anterior else ''
        auditoria.registrar(self.request.user, 'usuario_editado', 'usuarios',
                            f'Usuario editado: {usuario.email}{detalle}', self.request)
        if usuario.rol != rol_anterior:
            auditoria.registrar(self.request.user, 'usuario_rol_cambiado', 'usuarios',
                                f'Rol de {usuario.email}: {rol_anterior} -> {usuario.rol}', self.request)

    def perform_destroy(self, instance):
        if instance.rol == 'supervisor':
            supervisor = Supervisor.objects.filter(fo_usuario=instance).first()
            if supervisor is not None:
                cantidad = Empleado.objects.filter(fo_supervisor=supervisor).count()
                if cantidad > 0:
                    raise ValidationError({
                        'detail': (
                            f'No se puede eliminar: este supervisor tiene {cantidad} empleado(s) a cargo. '
                            'Reasígnalos a otro supervisor antes de eliminarlo.'
                        )
                    })
        correo, rol = instance.email, instance.rol
        instance.delete()
        auditoria.registrar(self.request.user, 'usuario_eliminado', 'usuarios',
                            f'Usuario eliminado: {correo} (rol {rol})', self.request)


class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'recursos_humanos')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_usuario = self.request.query_params.get('fo_usuario')
        if fo_usuario:
            queryset = queryset.filter(fo_usuario=fo_usuario)
        return queryset


class CapacitadorViewSet(viewsets.ModelViewSet):
    queryset = Capacitador.objects.all()
    serializer_class = CapacitadorSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'recursos_humanos', 'encargado_formacion')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class SupervisorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Supervisor.objects.select_related('fo_usuario').all()
    serializer_class = SupervisorSerializer
    permission_classes = [IsAuthenticated]


class TecnicoSoporteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = TecnicoSoporte.objects.select_related('fo_usuario').all()
    serializer_class = TecnicoSoporteSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('tecnico_soporte', 'administrador')]


class CambiarPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CambiarPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        password_actual = serializer.validated_data['password_actual']
        password_nueva = serializer.validated_data['password_nueva']

        if not request.user.check_password(password_actual):
            return Response({'detail': 'La contraseña actual es incorrecta.'}, status=400)

        request.user.set_password(password_nueva)
        request.user.save()
        return Response({'detail': 'Contraseña actualizada correctamente.'}, status=200)


class SolicitarRecuperacionView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = SolicitarRecuperacionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        email = serializer.validated_data['email']

        try:
            usuario = Usuario.objects.get(email=email)
        except Usuario.DoesNotExist:
            usuario = None

        if usuario is not None:
            password_nueva = secrets.token_urlsafe(8)
            usuario.set_password(password_nueva)
            usuario.save()

            notificar(
                usuario=usuario,
                mensaje_interno='Se generó una nueva contraseña temporal por solicitud de recuperación.',
                asunto_correo='Recuperación de contraseña - TRAINET',
                cuerpo_correo=f'Hola {usuario.nombre}, recibimos una solicitud para recuperar tu acceso a TRAINET. Tu nueva contraseña temporal es: {password_nueva}. Te recomendamos cambiarla desde tu perfil al ingresar.'
            )

        return Response(
            {'detail': 'Si el correo está registrado, se envió una nueva contraseña temporal.'},
            status=200
        )
