from django.contrib import admin
from .models import (
    ModuloCapacitacion, CategoriaCurso, Curso, Capacitacion,
    ParticipanteCapacitacion, ProgresoCurso, MaterialEducativo,
    EvidenciaParticipacion, CursosImpartidos
)


@admin.register(ModuloCapacitacion)
class ModuloCapacitacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'participantes_activos')


@admin.register(CategoriaCurso)
class CategoriaCursoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_categoria')


@admin.register(Curso)
class CursoAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'estado', 'fo_categoria_curso')


@admin.register(Capacitacion)
class CapacitacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_curso', 'fecha_inicio', 'fecha_fin', 'fo_instructor')


@admin.register(ParticipanteCapacitacion)
class ParticipanteCapacitacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_empleado', 'fo_capacitacion', 'asistio')


@admin.register(ProgresoCurso)
class ProgresoCursoAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_empleado', 'fo_curso', 'porcentaje')


@admin.register(MaterialEducativo)
class MaterialEducativoAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'fo_curso')


@admin.register(EvidenciaParticipacion)
class EvidenciaParticipacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_participante', 'fecha_subida')


@admin.register(CursosImpartidos)
class CursosImpartidosAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_capacitador', 'fo_curso')
