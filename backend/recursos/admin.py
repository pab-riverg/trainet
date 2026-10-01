from django.contrib import admin
from .models import ModuloPedidoRecursos, TipoRecurso, SolicitudRecursos


@admin.register(ModuloPedidoRecursos)
class ModuloPedidoRecursosAdmin(admin.ModelAdmin):
    list_display = ('id', 'presupuesto_asignado', 'fo_sistema')


@admin.register(TipoRecurso)
class TipoRecursoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_tipo', 'disponible')


@admin.register(SolicitudRecursos)
class SolicitudRecursosAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario', 'fo_tipo_recurso', 'estado', 'prioridad', 'fecha_solicitud')
