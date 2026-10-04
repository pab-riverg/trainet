from django.contrib import admin
from .models import (
    SistemaTrainet, ModuloAdministracion, Configuracion,
    ConfiguracionSistema, ModuloActivo, LogAuditoria, Permiso,
    ModuloAcceso, AreasResponsabilidad, ProcesoCargo,
    DocumentoInstitucional
)


@admin.register(SistemaTrainet)
class SistemaTrainetAdmin(admin.ModelAdmin):
    list_display = ('id', 'version', 'fecha_instalacion')


@admin.register(ModuloAdministracion)
class ModuloAdministracionAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_sistema')


@admin.register(Configuracion)
class ConfiguracionAdmin(admin.ModelAdmin):
    list_display = ('id', 'clave', 'valor', 'fo_sistema')


@admin.register(ConfiguracionSistema)
class ConfiguracionSistemaAdmin(admin.ModelAdmin):
    list_display = ('id', 'clave', 'valor', 'fo_mod_admin')


@admin.register(ModuloActivo)
class ModuloActivoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_modulo', 'fo_sistema')


@admin.register(LogAuditoria)
class LogAuditoriaAdmin(admin.ModelAdmin):
    """La bitácora es inmutable: solo lectura, sin agregar, editar ni borrar."""
    list_display = ('id', 'fecha_hora', 'accion', 'modulo', 'descripcion', 'fo_usuario', 'ip')
    list_filter = ('accion', 'modulo')
    search_fields = ('descripcion',)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Permiso)
class PermisoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_permiso', 'fo_administrador')


@admin.register(ModuloAcceso)
class ModuloAccesoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_modulo', 'fo_administrador')


@admin.register(AreasResponsabilidad)
class AreasResponsabilidadAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_area', 'fo_directivo')


@admin.register(ProcesoCargo)
class ProcesoCargoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_proceso', 'fo_enc_admin')


@admin.register(DocumentoInstitucional)
class DocumentoInstitucionalAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'fo_usuario', 'fecha_subida')
