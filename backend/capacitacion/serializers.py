from rest_framework import serializers

from .models import (
    Capacitacion,
    Curso,
    EvidenciaParticipacion,
    MaterialEducativo,
    ParticipanteCapacitacion,
    ProgresoCurso,
)


class CursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curso
        fields = '__all__'


class CapacitacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Capacitacion
        fields = '__all__'


class MaterialEducativoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialEducativo
        fields = '__all__'


class ParticipanteCapacitacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParticipanteCapacitacion
        fields = '__all__'


class EvidenciaParticipacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenciaParticipacion
        fields = '__all__'


class ProgresoCursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProgresoCurso
        fields = '__all__'
