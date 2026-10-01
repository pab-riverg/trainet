from django.contrib import admin
from .models import (
    ModuloComprasInternas, OrdenCompra, ItemOrden,
    ProveedorAutorizado, CotizacionCompra
)


@admin.register(ModuloComprasInternas)
class ModuloComprasInternasAdmin(admin.ModelAdmin):
    list_display = ('id', 'presupuesto_disponible', 'fo_sistema')


@admin.register(OrdenCompra)
class OrdenCompraAdmin(admin.ModelAdmin):
    list_display = ('id', 'descripcion', 'estado', 'fo_usuario', 'fo_proveedor', 'total')


@admin.register(ItemOrden)
class ItemOrdenAdmin(admin.ModelAdmin):
    list_display = ('id', 'descripcion_item', 'cantidad', 'subtotal', 'fo_orden')


@admin.register(ProveedorAutorizado)
class ProveedorAutorizadoAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_proveedor', 'fo_mod_compras')


@admin.register(CotizacionCompra)
class CotizacionCompraAdmin(admin.ModelAdmin):
    list_display = ('id', 'fo_orden', 'fecha_carga')
