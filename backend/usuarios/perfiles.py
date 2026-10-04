from django.utils import timezone
from rest_framework import serializers

from .models import (
    Administrador,
    Capacitador,
    Directivo,
    Empleado,
    EncargadoAdministrativo,
    EncargadoDocumental,
    EncargadoFormacion,
    ProveedorContenido,
    RecursosHumanos,
    Supervisor,
    TecnicoSoporte,
)


class EmpleadoPerfilSerializer(serializers.ModelSerializer):
    # Opcional al crear: validar_perfil() rellena la fecha de hoy cuando falta y la
    # validación es completa (no parcial). En edición parcial no se asigna default.
    fecha_ingreso = serializers.DateField(required=False)

    class Meta:
        model = Empleado
        fields = ['puesto', 'fecha_ingreso', 'fo_supervisor']


class RecursosHumanosPerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = RecursosHumanos
        fields = ['departamento']


class CapacitadorPerfilSerializer(serializers.ModelSerializer):
    experiencia = serializers.IntegerField(required=False, min_value=0)

    class Meta:
        model = Capacitador
        fields = ['especialidad_tecnica', 'experiencia']


class TecnicoSoportePerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = TecnicoSoporte
        fields = ['especialidad_tecnica']


# Modelo de perfil asociado a cada rol. Los 11 roles de Usuario.ROL_CHOICES están
# representados; los roles sin datos extra se crean con los defaults del modelo.
ROL_MODELOS_PERFIL = {
    'administrador': Administrador,
    'directivo': Directivo,
    'supervisor': Supervisor,
    'empleado': Empleado,
    'recursos_humanos': RecursosHumanos,
    'encargado_formacion': EncargadoFormacion,
    'encargado_documental': EncargadoDocumental,
    'capacitador': Capacitador,
    'tecnico_soporte': TecnicoSoporte,
    'encargado_administrativo': EncargadoAdministrativo,
    'proveedor_contenido': ProveedorContenido,
}

# Solo los roles que exigen datos adicionales tienen un serializer de validación aquí.
# También se reutilizan para la lectura (B3): los campos son los mismos.
ROL_SERIALIZERS_PERFIL = {
    'empleado': EmpleadoPerfilSerializer,
    'recursos_humanos': RecursosHumanosPerfilSerializer,
    'capacitador': CapacitadorPerfilSerializer,
    'tecnico_soporte': TecnicoSoportePerfilSerializer,
}


def validar_perfil(rol, datos, parcial=False):
    """Valida los datos de perfil para `rol`. Devuelve un dict validado ({} si el
    rol no exige datos). Si los datos no son válidos, lanza ValidationError con un
    dict plano {campo: [mensajes]} (sin anidar bajo 'perfil').

    `parcial=True` usa validación parcial (solo valida/incluye los campos enviados,
    como en una edición PATCH que no reemplaza todo el perfil). Con `parcial=False`
    (creación de la fila, ya sea por alta de usuario o por cambio de rol) y rol
    'empleado', si no viene 'fecha_ingreso' se usa la fecha de hoy.
    """
    serializer_class = ROL_SERIALIZERS_PERFIL.get(rol)
    if serializer_class is None:
        return {}

    serializer = serializer_class(data=datos or {}, partial=parcial)
    if not serializer.is_valid():
        raise serializers.ValidationError(serializer.errors)

    validado = serializer.validated_data

    if rol == 'empleado' and not parcial and 'fecha_ingreso' not in validado:
        validado['fecha_ingreso'] = timezone.localdate()

    return validado


def crear_perfil(usuario, datos_validados):
    """Crea la fila de perfil correspondiente al rol ACTUAL de `usuario`."""
    modelo = ROL_MODELOS_PERFIL.get(usuario.rol)
    if modelo is None:
        return None
    return modelo.objects.create(fo_usuario=usuario, **datos_validados)


def obtener_perfil(usuario, rol=None):
    """Devuelve la instancia de perfil de `usuario` para `rol` (por defecto, el rol
    actual de `usuario`), o None si no existe fila o el rol no tiene modelo de perfil."""
    modelo = ROL_MODELOS_PERFIL.get(rol or usuario.rol)
    if modelo is None:
        return None
    return modelo.objects.filter(fo_usuario=usuario).first()


def actualizar_perfil(instancia_perfil, datos_validados):
    """Aplica datos_validados (ya validados, típicamente de forma parcial) sobre una
    fila de perfil existente y la guarda."""
    for campo, valor in datos_validados.items():
        setattr(instancia_perfil, campo, valor)
    instancia_perfil.save()
    return instancia_perfil


def serializar_perfil(usuario):
    """Devuelve el dict de datos de perfil del usuario según su rol actual: {} si el
    rol no tiene datos extra, None si la fila de perfil no existe."""
    if usuario.rol not in ROL_MODELOS_PERFIL:
        return {}

    serializer_class = ROL_SERIALIZERS_PERFIL.get(usuario.rol)
    if serializer_class is None:
        return {}

    instancia = obtener_perfil(usuario)
    if instancia is None:
        return None

    return serializer_class(instancia).data
