from rest_framework import serializers

from .models import SolicitudRecursos, TipoRecurso


class TipoRecursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoRecurso
        fields = '__all__'


class SolicitudRecursosCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudRecursos
        fields = ['id', 'cantidad', 'justificacion', 'prioridad', 'fo_tipo_recurso', 'fo_mod_pedido']


class SolicitudRecursosSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudRecursos
        fields = '__all__'
