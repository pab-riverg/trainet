import os

from rest_framework import serializers

from .models import CategoriaTicket, EvidenciaTicket, ModuloSoporteTecnico, TicketSoporte

LIMITE_TAMANIO_ARCHIVO = 10 * 1024 * 1024
EXTENSIONES_PERMITIDAS = ['png', 'jpg', 'jpeg', 'pdf', 'txt', 'log', 'doc', 'docx']


class ModuloSoporteTecnicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuloSoporteTecnico
        fields = '__all__'


class CategoriaTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaTicket
        fields = '__all__'


class TicketSoporteSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='fo_categoria_ticket.nombre_categoria', read_only=True)
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True)
    tecnico_nombre = serializers.SerializerMethodField()

    class Meta:
        model = TicketSoporte
        fields = '__all__'
        read_only_fields = ['fo_usuario', 'fecha_creacion', 'fecha_resolucion', 'tiempo_resolucion']

    def get_tecnico_nombre(self, ticket):
        if ticket.fo_tecnico is None:
            return None
        return ticket.fo_tecnico.fo_usuario.nombre



class EvidenciaTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenciaTicket
        fields = '__all__'

    def validate_archivo(self, archivo):
        if archivo.size > LIMITE_TAMANIO_ARCHIVO:
            raise serializers.ValidationError('El archivo supera el límite de 10 MB.')
        extension = os.path.splitext(archivo.name)[1].lstrip('.').lower()
        if extension not in EXTENSIONES_PERMITIDAS:
            raise serializers.ValidationError(
                f'Tipo de archivo no permitido. Extensiones válidas: {", ".join(EXTENSIONES_PERMITIDAS)}.'
            )
        return archivo
