import os

from rest_framework import serializers

from .models import (
    CategoriaDocumento,
    Documento,
    HistorialAccesoDocumento,
    ModuloGestionDocumental,
    TipoDocumento,
)

LIMITE_TAMANIO_ARCHIVO = 10 * 1024 * 1024
EXTENSIONES_PERMITIDAS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'png', 'jpg', 'jpeg']


class ModuloGestionDocumentalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuloGestionDocumental
        fields = '__all__'


class TipoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoDocumento
        fields = '__all__'


class CategoriaDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaDocumento
        fields = '__all__'


class DocumentoSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.CharField(source='fo_tipo_documento.nombre_tipo', read_only=True)
    categoria_nombre = serializers.CharField(source='fo_categoria_documento.nombre_categoria', read_only=True)

    class Meta:
        model = Documento
        fields = '__all__'
        read_only_fields = ['tamanio']

    def validate_archivo(self, archivo):
        if archivo.size > LIMITE_TAMANIO_ARCHIVO:
            raise serializers.ValidationError('El archivo supera el límite de 10 MB.')
        extension = os.path.splitext(archivo.name)[1].lstrip('.').lower()
        if extension not in EXTENSIONES_PERMITIDAS:
            raise serializers.ValidationError(
                f'Tipo de archivo no permitido. Extensiones válidas: {", ".join(EXTENSIONES_PERMITIDAS)}.'
            )
        return archivo


class HistorialAccesoDocumentoSerializer(serializers.ModelSerializer):
    documento_titulo = serializers.CharField(source='fo_documento.titulo', read_only=True)
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True)

    class Meta:
        model = HistorialAccesoDocumento
        fields = '__all__'
