from rest_framework import serializers

from .models import (
    ContratoProveedor,
    CotizacionProveedor,
    NecesidadCapacitacionExterna,
    Proveedor,
    ServicioProveedor,
)


class ProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Proveedor
        fields = '__all__'


class ServicioProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioProveedor
        fields = '__all__'


class ContratoProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContratoProveedor
        fields = '__all__'


class NecesidadCapacitacionExternaSerializer(serializers.ModelSerializer):
    class Meta:
        model = NecesidadCapacitacionExterna
        fields = '__all__'


class CotizacionProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotizacionProveedor
        fields = '__all__'
