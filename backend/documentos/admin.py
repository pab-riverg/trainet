from django.contrib import admin
from .models import (
    ModuloGestionDocumental, TipoDocumento, CategoriaDocumento,
    Documento, HistorialAccesoDocumento, TipoDocumentoAcceso,
    CategoriaAccesoDoc
)


@admin.register(ModuloGestionDocumental)
class ModuloGestionDocumentalAdmin(admin.ModelAdmin):
    list_display = ('id', 'documentos_almacenados', 'fo_sistema')


@admin.register(TipoDocumento)
class TipoDocumentoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_tipo')


@admin.register(CategoriaDocumento)
class CategoriaDocumentoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_categoria', 'fo_mod_doc')


@admin.register(Documento)
class DocumentoAdmin(admin.ModelAdmin):
    list_display = ('id', 'titulo', 'version', 'fo_tipo_documento', 'fo_categoria_documento')


@admin.register(HistorialAccesoDocumento)
class HistorialAccesoDocumentoAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_documento', 'fo_usuario', 'accion', 'fecha')


@admin.register(TipoDocumentoAcceso)
class TipoDocumentoAccesoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_tipo', 'fo_enc_doc')


@admin.register(CategoriaAccesoDoc)
class CategoriaAccesoDocAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre_categoria', 'fo_enc_doc')
