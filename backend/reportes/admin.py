from django.contrib import admin
from .models import (
    ModuloReportes, TipoReporte, FrecuenciaReporte, Reporte,
    DatoReporte, ParametroReporte, ArchivoImportado
)


@admin.register(ModuloReportes)
class ModuloReportesAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_sistema')


@admin.register(TipoReporte)
class TipoReporteAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_tipo', 'origen', 'fo_mod_reportes')


@admin.register(FrecuenciaReporte)
class FrecuenciaReporteAdmin(admin.ModelAdmin):
    list_display = ('id', 'descripcion', 'fo_mod_reportes')


@admin.register(Reporte)
class ReporteAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'fo_tipo_reporte', 'fo_usuario', 'fecha_generacion')


@admin.register(DatoReporte)
class DatoReporteAdmin(admin.ModelAdmin):
    list_display = ('id', 'descripcion_dato', 'fo_reporte')


@admin.register(ParametroReporte)
class ParametroReporteAdmin(admin.ModelAdmin):
    list_display = ('id', 'clave_parametro', 'valor_parametro', 'fo_reporte')


@admin.register(ArchivoImportado)
class ArchivoImportadoAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'fo_tipo', 'formato', 'fecha_documento', 'filas', 'activo')
