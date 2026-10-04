import os

from rest_framework import serializers

from documentos.serializers import EXTENSIONES_PERMITIDAS, LIMITE_TAMANIO_ARCHIVO

from .auditoria import ACCIONES, MODULOS
from .models import DocumentoInstitucional, LogAuditoria


class DocumentoInstitucionalSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True)

    class Meta:
        model = DocumentoInstitucional
        fields = ['id', 'titulo', 'descripcion', 'archivo', 'fecha_subida', 'fo_usuario', 'usuario_nombre']
        read_only_fields = ['fo_usuario', 'usuario_nombre']

    def validate_archivo(self, archivo):
        if archivo.size > LIMITE_TAMANIO_ARCHIVO:
            raise serializers.ValidationError('El archivo supera el límite de 10 MB.')
        extension = os.path.splitext(archivo.name)[1].lstrip('.').lower()
        if extension not in EXTENSIONES_PERMITIDAS:
            raise serializers.ValidationError(
                f'Tipo de archivo no permitido. Extensiones válidas: {", ".join(EXTENSIONES_PERMITIDAS)}.'
            )
        return archivo


class LogAuditoriaSerializer(serializers.ModelSerializer):
    """Solo lectura: la bitácora no se modifica desde la API."""
    accion_etiqueta = serializers.SerializerMethodField()
    modulo_etiqueta = serializers.SerializerMethodField()
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True, default=None)

    class Meta:
        model = LogAuditoria
        fields = ['id', 'fecha_evento', 'fecha_hora', 'accion', 'accion_etiqueta', 'modulo', 'modulo_etiqueta',
                  'descripcion', 'fo_usuario', 'usuario_nombre', 'ip']
        read_only_fields = fields

    def get_accion_etiqueta(self, registro):
        return ACCIONES.get(registro.accion, registro.accion)

    def get_modulo_etiqueta(self, registro):
        return MODULOS.get(registro.modulo, registro.modulo)
