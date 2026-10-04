import os

from rest_framework import serializers

from .models import CategoriaContenido, Contenido, EstadoContenido, ModuloInventarioContenido

LIMITE_TAMANIO_ARCHIVO = 50 * 1024 * 1024
EXTENSIONES_PERMITIDAS = ['mp4', 'webm', 'mov', 'pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'png', 'jpg', 'jpeg']


class ModuloInventarioContenidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuloInventarioContenido
        fields = '__all__'


class CategoriaContenidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaContenido
        fields = '__all__'


class EstadoContenidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoContenido
        fields = '__all__'


class ContenidoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='fo_categoria_cont.nombre_categoria', read_only=True)
    estado_nombre = serializers.CharField(source='fo_estado_cont.nombre_estado', read_only=True)

    class Meta:
        model = Contenido
        fields = '__all__'

    def validate_archivo(self, archivo):
        if archivo.size > LIMITE_TAMANIO_ARCHIVO:
            raise serializers.ValidationError('El archivo supera el límite de 50 MB.')
        extension = os.path.splitext(archivo.name)[1].lstrip('.').lower()
        if extension not in EXTENSIONES_PERMITIDAS:
            raise serializers.ValidationError(
                f'Tipo de archivo no permitido. Extensiones válidas: {", ".join(EXTENSIONES_PERMITIDAS)}.'
            )
        return archivo
