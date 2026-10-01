from rest_framework import serializers

from .models import (
    DatoReporte,
    FrecuenciaReporte,
    ParametroReporte,
    Reporte,
    TipoReporte,
)


class TipoReporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoReporte
        fields = '__all__'


class FrecuenciaReporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FrecuenciaReporte
        fields = '__all__'


class ReporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reporte
        fields = '__all__'
        read_only_fields = ['fo_usuario']


class DatoReporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatoReporte
        fields = '__all__'


class ParametroReporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametroReporte
        fields = '__all__'
