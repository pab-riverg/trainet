from django.contrib import admin
from .models import (
    Usuario, Administrador, Directivo, Supervisor, Empleado,
    RecursosHumanos, EncargadoFormacion, EncargadoDocumental,
    Capacitador, TecnicoSoporte, EncargadoAdministrativo,
    ProveedorContenido
)


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'email', 'rol')


@admin.register(Administrador)
class AdministradorAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario')


@admin.register(Directivo)
class DirectivoAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario')


@admin.register(Supervisor)
class SupervisorAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario')


@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario')


@admin.register(RecursosHumanos)
class RecursosHumanosAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario')


@admin.register(EncargadoFormacion)
class EncargadoFormacionAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario')


@admin.register(EncargadoDocumental)
class EncargadoDocumentalAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario')


@admin.register(Capacitador)
class CapacitadorAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario')


@admin.register(TecnicoSoporte)
class TecnicoSoporteAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario')


@admin.register(EncargadoAdministrativo)
class EncargadoAdministrativoAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario')


@admin.register(ProveedorContenido)
class ProveedorContenidoAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_usuario')
