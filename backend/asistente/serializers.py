from rest_framework import serializers

from .models import BaseConocimiento, ConsultaFrecuente, HistorialConsulta


class ConsultaFrecuenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultaFrecuente
        fields = '__all__'


class BaseConocimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaseConocimiento
        fields = '__all__'


class HistorialConsultaSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialConsulta
        fields = '__all__'
