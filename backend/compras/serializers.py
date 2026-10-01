from rest_framework import serializers

from .models import CotizacionCompra, ItemOrden, OrdenCompra


class OrdenCompraCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdenCompra
        fields = ['id', 'descripcion', 'motivo', 'area', 'fo_mod_compras']


class OrdenCompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdenCompra
        fields = '__all__'


class ItemOrdenSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemOrden
        fields = '__all__'


class CotizacionCompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = CotizacionCompra
        fields = '__all__'
