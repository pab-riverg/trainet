from rest_framework import serializers

from .models import EvidenciaTicket, TicketSoporte


class TicketSoporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketSoporte
        fields = '__all__'


class EvidenciaTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenciaTicket
        fields = '__all__'
