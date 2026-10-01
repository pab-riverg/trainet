from django.contrib import admin
from .models import (
    ModuloInventarioContenido, CategoriaContenido, EstadoContenido, Contenido
)


@admin.register(ModuloInventarioContenido)
class ModuloInventarioContenidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_sistema')


@admin.register(CategoriaContenido)
class CategoriaContenidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_categoria')


@admin.register(EstadoContenido)
class EstadoContenidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_estado')


@admin.register(Contenido)
class ContenidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_contenido', 'fo_categoria_cont', 'fo_estado_cont', 'fecha_actualizacion')
