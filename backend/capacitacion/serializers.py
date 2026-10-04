from rest_framework import serializers

from .models import (
    Capacitacion,
    CategoriaCurso,
    Curso,
    EvidenciaParticipacion,
    MaterialEducativo,
    ModuloCapacitacion,
    ParticipanteCapacitacion,
    ProgresoCurso,
)


class ModuloCapacitacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuloCapacitacion
        fields = '__all__'


class CategoriaCursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoriaCurso
        fields = '__all__'


class CursoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='fo_categoria_curso.nombre_categoria', read_only=True)

    class Meta:
        model = Curso
        fields = '__all__'


class CapacitacionSerializer(serializers.ModelSerializer):
    curso_titulo = serializers.CharField(source='fo_curso.titulo', read_only=True)
    instructor_nombre = serializers.CharField(source='fo_instructor.fo_usuario.nombre', read_only=True)

    class Meta:
        model = Capacitacion
        fields = '__all__'


class MaterialEducativoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialEducativo
        fields = '__all__'


class ParticipanteCapacitacionSerializer(serializers.ModelSerializer):
    empleado_nombre = serializers.CharField(source='fo_empleado.fo_usuario.nombre', read_only=True)
    curso_titulo = serializers.CharField(source='fo_capacitacion.fo_curso.titulo', read_only=True)
    fecha_inicio = serializers.DateField(source='fo_capacitacion.fecha_inicio', read_only=True)

    class Meta:
        model = ParticipanteCapacitacion
        fields = '__all__'


class EvidenciaParticipacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvidenciaParticipacion
        fields = '__all__'


class ProgresoCursoSerializer(serializers.ModelSerializer):
    curso_titulo = serializers.CharField(source='fo_curso.titulo', read_only=True)

    class Meta:
        model = ProgresoCurso
        fields = '__all__'
