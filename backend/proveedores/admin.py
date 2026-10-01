from django.contrib import admin
from .models import (
    ModuloGestionProveedores, Proveedor, ServicioProveedor,
    ContratoProveedor, NecesidadCapacitacionExterna, CotizacionProveedor,
    EvaluacionProveedor
)


@admin.register(ModuloGestionProveedores)
class ModuloGestionProveedoresAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_sistema')


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ('id', 'razon_social', 'especialidad', 'calificacion')


@admin.register(ServicioProveedor)
class ServicioProveedorAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_servicio', 'fo_proveedor')


@admin.register(ContratoProveedor)
class ContratoProveedorAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_proveedor', 'estado', 'fecha_inicio', 'fecha_fin')


@admin.register(NecesidadCapacitacionExterna)
class NecesidadCapacitacionExternaAdmin(admin.ModelAdmin):
    list_display = ('id', 'tema', 'area', 'fo_usuario', 'fecha')


@admin.register(CotizacionProveedor)
class CotizacionProveedorAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_proveedor', 'fecha_carga')


@admin.register(EvaluacionProveedor)
class EvaluacionProveedorAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_proveedor', 'puntuacion', 'fecha_evaluacion')
