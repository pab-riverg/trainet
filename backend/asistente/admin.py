from django.contrib import admin
from .models import (
    ModuloAsistenteVirtual, ConsultaFrecuente, BaseConocimiento,
    HistorialConsulta
)


@admin.register(ModuloAsistenteVirtual)
class ModuloAsistenteVirtualAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_sistema')


@admin.register(ConsultaFrecuente)
class ConsultaFrecuenteAdmin(admin.ModelAdmin):
    list_display = ('id', 'pregunta', 'categoria')


@admin.register(BaseConocimiento)
class BaseConocimientoAdmin(admin.ModelAdmin):
    list_display = ('id', 'tema', 'fo_mod_asistente')


@admin.register(HistorialConsulta)
class HistorialConsultaAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario', 'pregunta_usuario', 'fo_consulta_frecuente', 'fecha')
