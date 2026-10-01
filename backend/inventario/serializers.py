from rest_framework import serializers

from .models import Contenido


class ContenidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contenido
        fields = '__all__'
