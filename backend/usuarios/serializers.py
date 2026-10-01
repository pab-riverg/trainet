import secrets

from rest_framework import serializers

from notificaciones.utils import notificar

from .models import Empleado, Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'nombre', 'email', 'fecha_registro', 'telefono', 'is_active', 'rol']


class UsuarioRegistroSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['nombre', 'email', 'telefono', 'rol']

    def create(self, validated_data):
        password_generada = secrets.token_urlsafe(8)
        usuario = Usuario.objects.create_user(**validated_data, password=password_generada)

        notificar(
            usuario=usuario,
            mensaje_interno='Se creó tu cuenta en TRAINET. Revisa tu correo para tu contraseña de acceso.',
            asunto_correo='Bienvenido a TRAINET',
            cuerpo_correo=f'Hola {usuario.nombre}, tu cuenta fue creada. Tu contraseña temporal es: {password_generada}. Te recomendamos cambiarla al ingresar.'
        )

        return usuario


class EmpleadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empleado
        fields = ['id', 'fo_usuario', 'puesto', 'fecha_ingreso', 'fo_supervisor']


class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    password_nueva = serializers.CharField(write_only=True)
