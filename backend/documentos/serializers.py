from rest_framework import serializers

from .models import Documento, HistorialAccesoDocumento


class DocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Documento
        fields = '__all__'
        read_only_fields = ['tamanio']


class HistorialAccesoDocumentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialAccesoDocumento
        fields = '__all__'
