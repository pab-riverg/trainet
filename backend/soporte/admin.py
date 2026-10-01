from django.contrib import admin
from .models import (
    ModuloSoporteTecnico, CategoriaTicket, TicketSoporte, EvidenciaTicket,
    HerramientaTecnico, SolicitudComun
)


@admin.register(ModuloSoporteTecnico)
class ModuloSoporteTecnicoAdmin(admin.ModelAdmin):
    list_display = ('id', 'tiempo_respuesta', 'fo_sistema')


@admin.register(CategoriaTicket)
class CategoriaTicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_categoria')


@admin.register(TicketSoporte)
class TicketSoporteAdmin(admin.ModelAdmin):
    list_display = ('id', 'descripcion', 'estado', 'prioridad', 'fo_tecnico', 'fo_usuario')


@admin.register(EvidenciaTicket)
class EvidenciaTicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_ticket', 'fecha_subida')


@admin.register(HerramientaTecnico)
class HerramientaTecnicoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_herramienta', 'fo_tecnico')


@admin.register(SolicitudComun)
class SolicitudComunAdmin(admin.ModelAdmin):
    list_display = ('id', 'descripcion', 'fo_mod_soporte')
