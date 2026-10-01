from rest_framework import serializers

from .models import DocumentoInstitucional


class DocumentoInstitucionalSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoInstitucional
        fields = ['id', 'titulo', 'descripcion', 'archivo', 'fecha_subida', 'fo_usuario']
        read_only_fields = ['fo_usuario']
