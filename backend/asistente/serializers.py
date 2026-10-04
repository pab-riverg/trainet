import os

from rest_framework import serializers
from rest_framework.fields import empty

from .models import (
    BaseConocimiento,
    CategoriaAsistente,
    ConsultaFrecuente,
    HistorialConsulta,
    ModuloAsistenteVirtual,
)

LIMITE_TAMANIO_ARCHIVO = 10 * 1024 * 1024
EXTENSIONES_RESPUESTA = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg']


class BooleanoOpcional(serializers.BooleanField):
    """En multipart, un booleano ausente no debe leerse como False: se usa el valor por defecto."""
    default_empty_html = empty


class ModuloAsistenteVirtualSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuloAsistenteVirtual
        fields = '__all__'


class CategoriaAsistenteSerializer(serializers.ModelSerializer):
    total_consultas = serializers.SerializerMethodField()

    class Meta:
        model = CategoriaAsistente
        fields = ['id', 'nombre', 'icono', 'orden', 'fo_mod_asistente', 'total_consultas']
        extra_kwargs = {'fo_mod_asistente': {'required': False}}

    def get_total_consultas(self, categoria):
        return categoria.consultafrecuente_set.filter(activa=True).count()

    def validate_nombre(self, valor):
        valor = valor.strip()
        if not valor:
            raise serializers.ValidationError('El nombre es obligatorio.')
        otras = CategoriaAsistente.objects.exclude(pk=self.instance.pk) if self.instance else CategoriaAsistente.objects.all()
        if otras.filter(nombre__iexact=valor).exists():
            raise serializers.ValidationError('Ya existe una categoría con ese nombre.')
        return valor


class ConsultaFrecuenteSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='fo_categoria.nombre', read_only=True, default=None)
    categoria_icono = serializers.CharField(source='fo_categoria.icono', read_only=True, default=None)
    archivo_nombre = serializers.SerializerMethodField()
    activa = BooleanoOpcional(required=False, default=True)

    class Meta:
        model = ConsultaFrecuente
        fields = ['id', 'pregunta', 'respuesta', 'fo_categoria', 'categoria_nombre', 'categoria_icono',
                  'palabras_clave', 'archivo', 'archivo_nombre', 'activa', 'fo_mod_asistente']
        extra_kwargs = {'fo_mod_asistente': {'required': False}}

    def get_archivo_nombre(self, consulta):
        return os.path.basename(consulta.archivo.name) if consulta.archivo else None

    def validate_pregunta(self, valor):
        valor = valor.strip()
        if not valor:
            raise serializers.ValidationError('La pregunta es obligatoria.')
        otras = ConsultaFrecuente.objects.exclude(pk=self.instance.pk) if self.instance else ConsultaFrecuente.objects.all()
        if otras.filter(pregunta__iexact=valor).exists():
            raise serializers.ValidationError('Ya existe una pregunta frecuente con ese texto.')
        return valor

    def validate_respuesta(self, valor):
        valor = valor.strip()
        if not valor:
            raise serializers.ValidationError('La respuesta es obligatoria.')
        return valor

    def validate_archivo(self, archivo):
        if archivo is None:
            return archivo
        if archivo.size > LIMITE_TAMANIO_ARCHIVO:
            raise serializers.ValidationError('El archivo supera el límite de 10 MB.')
        extension = os.path.splitext(archivo.name)[1].lstrip('.').lower()
        if extension not in EXTENSIONES_RESPUESTA:
            raise serializers.ValidationError(
                f'Tipo de archivo no permitido. Extensiones válidas: {", ".join(EXTENSIONES_RESPUESTA)}.'
            )
        return archivo


class BaseConocimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaseConocimiento
        fields = '__all__'


class HistorialConsultaSerializer(serializers.ModelSerializer):
    texto = serializers.CharField(source='pregunta_usuario', read_only=True)
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True)
    consulta = serializers.PrimaryKeyRelatedField(source='fo_consulta_frecuente', read_only=True)
    consulta_pregunta = serializers.CharField(source='fo_consulta_frecuente.pregunta', read_only=True, default=None)

    class Meta:
        model = HistorialConsulta
        fields = ['id', 'fo_usuario', 'usuario_nombre', 'texto', 'origen', 'consulta', 'consulta_pregunta',
                  'resuelta', 'util', 'fecha']
        read_only_fields = fields


class PreguntarSerializer(serializers.Serializer):
    texto = serializers.CharField(allow_blank=True, trim_whitespace=True)


class SeleccionarSerializer(serializers.Serializer):
    consulta = serializers.IntegerField()


class ValorarSerializer(serializers.Serializer):
    util = serializers.BooleanField()
