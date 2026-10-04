import secrets

from django.db import transaction
from rest_framework import serializers

from notificaciones.utils import notificar
from trainet_backend.validadores import validar_cedula, validar_telefono

from .models import Capacitador, Empleado, Supervisor, TecnicoSoporte, Usuario
from .perfiles import actualizar_perfil, crear_perfil, obtener_perfil, serializar_perfil, validar_perfil


class ValidacionContactoMixin:
    """Valida teléfono y cédula con los formatos compartidos (solo si el campo viene en la petición)."""

    def validate_telefono(self, valor):
        return validar_telefono(valor)

    def validate_cedula(self, valor):
        cedula = validar_cedula(valor)
        if cedula is not None:
            otros = Usuario.objects.exclude(pk=self.instance.pk) if getattr(self, 'instance', None) else Usuario.objects.all()
            if otros.filter(cedula=cedula).exists():
                raise serializers.ValidationError('Esta cédula ya está registrada.')
        return cedula


class UsuarioSerializer(ValidacionContactoMixin, serializers.ModelSerializer):
    # Solo se usa en update/partial_update (ver UsuarioViewSet.get_serializer_class):
    # ese camino ya está restringido a administradores.
    perfil = serializers.DictField(required=False, write_only=True)
    cedula = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=20)

    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'email', 'fecha_registro', 'telefono', 'cedula', 'is_active', 'rol', 'perfil']

    def validate(self, attrs):
        request = self.context.get('request')
        nuevo_rol = attrs.get('rol')

        if (
            request is not None
            and self.instance is not None
            and nuevo_rol is not None
            and nuevo_rol != self.instance.rol
            and request.user.id == self.instance.id
        ):
            raise serializers.ValidationError({'rol': ['No puedes cambiar tu propio rol.']})

        if self.instance is None:
            return attrs

        rol_cambia = nuevo_rol is not None and nuevo_rol != self.instance.rol
        rol_efectivo = nuevo_rol if rol_cambia else self.instance.rol
        datos_perfil = attrs.get('perfil')

        if rol_cambia or datos_perfil is not None:
            perfil_existente = obtener_perfil(self.instance, rol=rol_efectivo)
            attrs['perfil'] = validar_perfil(rol_efectivo, datos_perfil or {}, parcial=perfil_existente is not None)

        return attrs

    def update(self, instance, validated_data):
        datos_perfil = validated_data.pop('perfil', None)

        with transaction.atomic():
            instance = super().update(instance, validated_data)

            if datos_perfil is not None:
                perfil_existente = obtener_perfil(instance)
                if perfil_existente is not None:
                    actualizar_perfil(perfil_existente, datos_perfil)
                else:
                    crear_perfil(instance, datos_perfil)

        return instance


class UsuarioDetalleSerializer(UsuarioSerializer):
    # Usado solo en retrieve (ver UsuarioViewSet.get_serializer_class) para no pagar
    # el costo de resolver el perfil en cada fila del listado.
    perfil = serializers.SerializerMethodField()
    # Supervisor del empleado: solo nombre y correo (nunca cédula, teléfono ni otros datos). null si no aplica.
    supervisor = serializers.SerializerMethodField()

    class Meta(UsuarioSerializer.Meta):
        fields = UsuarioSerializer.Meta.fields + ['supervisor']

    def get_perfil(self, obj):
        return serializar_perfil(obj)

    def get_supervisor(self, obj):
        empleado = Empleado.objects.select_related('fo_supervisor__fo_usuario').filter(fo_usuario=obj).first()
        usuario = empleado.fo_supervisor.fo_usuario if empleado and empleado.fo_supervisor else None
        return {'nombre': usuario.nombre, 'email': usuario.email} if usuario else None


class UsuarioRegistroSerializer(ValidacionContactoMixin, serializers.ModelSerializer):
    perfil = serializers.DictField(required=False, write_only=True)
    cedula = serializers.CharField(required=False, allow_null=True, allow_blank=True, max_length=20)

    class Meta:
        model = Usuario
        fields = ['nombre', 'email', 'telefono', 'cedula', 'rol', 'perfil']

    def validate(self, attrs):
        attrs['perfil'] = validar_perfil(attrs['rol'], attrs.get('perfil', {}))
        return attrs

    def create(self, validated_data):
        datos_perfil = validated_data.pop('perfil', {})
        password_generada = secrets.token_urlsafe(8)

        with transaction.atomic():
            usuario = Usuario.objects.create_user(**validated_data, password=password_generada)
            crear_perfil(usuario, datos_perfil)

            notificar(
                usuario=usuario,
                mensaje_interno='Se creó tu cuenta en TRAINET. Revisa tu correo para tu contraseña de acceso.',
                asunto_correo='Bienvenido a TRAINET',
                cuerpo_correo=f'Hola {usuario.nombre}, tu cuenta fue creada. Tu contraseña temporal es: {password_generada}. Te recomendamos cambiarla al ingresar.'
            )

        return usuario


class UsuarioAutoeditarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'email', 'fecha_registro', 'telefono', 'cedula', 'is_active', 'rol']
        # Quien edita su propio perfil solo cambia el teléfono; la cédula la gestiona el administrador.
        read_only_fields = ['id', 'nombre', 'email', 'fecha_registro', 'cedula', 'is_active', 'rol']

    def validate_telefono(self, valor):
        return validar_telefono(valor)


class EmpleadoSerializer(serializers.ModelSerializer):
    fo_usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True)

    class Meta:
        model = Empleado
        fields = ['id', 'fo_usuario', 'fo_usuario_nombre', 'puesto', 'fecha_ingreso', 'fo_supervisor']


class CapacitadorSerializer(serializers.ModelSerializer):
    fo_usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True)

    class Meta:
        model = Capacitador
        fields = ['id', 'fo_usuario', 'fo_usuario_nombre', 'especialidad_tecnica', 'experiencia']


class SupervisorSerializer(serializers.ModelSerializer):
    fo_usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True)

    class Meta:
        model = Supervisor
        fields = ['id', 'fo_usuario', 'fo_usuario_nombre']


class TecnicoSoporteSerializer(serializers.ModelSerializer):
    fo_usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True)

    class Meta:
        model = TecnicoSoporte
        fields = ['id', 'fo_usuario', 'fo_usuario_nombre', 'especialidad_tecnica', 'tickets_resueltos']


class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    password_nueva = serializers.CharField(write_only=True)


class SolicitarRecuperacionSerializer(serializers.Serializer):
    email = serializers.EmailField()
