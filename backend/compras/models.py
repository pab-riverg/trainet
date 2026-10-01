from django.db import models

from administracion.models import SistemaTrainet
from proveedores.models import Proveedor
from usuarios.models import Usuario


class ModuloComprasInternas(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_mod_compras')
    presupuesto_disponible = models.IntegerField(default=0)
    fo_sistema = models.ForeignKey(SistemaTrainet, on_delete=models.CASCADE, db_column='fo_sistema')

    class Meta:
        db_table = 'modulo_compras_internas'

    def __str__(self):
        return f'Módulo de compras internas {self.id}'


class OrdenCompra(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_orden')
    fecha_orden = models.DateField(auto_now_add=True)
    iva = models.IntegerField(default=0)
    total = models.IntegerField(default=0)
    estado = models.CharField(max_length=50, choices=[
        ('pendiente', 'Pendiente'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
        ('compra_confirmada', 'Compra Confirmada'),
        ('entregada', 'Entregada'),
    ])
    descripcion = models.CharField(max_length=255)
    motivo = models.CharField(max_length=255)
    area = models.CharField(max_length=255)
    comentario_decision = models.CharField(max_length=255, blank=True)
    factura_comprobante = models.FileField(upload_to='facturas_compras/', blank=True, null=True)
    fo_proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, db_column='fo_proveedor', blank=True, null=True)
    fo_mod_compras = models.ForeignKey(ModuloComprasInternas, on_delete=models.CASCADE, db_column='fo_mod_compras')
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')

    class Meta:
        db_table = 'orden_compra'

    def __str__(self):
        return f'Orden #{self.id} - {self.descripcion} ({self.estado})'


class ItemOrden(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_item')
    descripcion_item = models.CharField(max_length=255)
    cantidad = models.IntegerField(default=0)
    subtotal = models.IntegerField(default=0)
    fo_orden = models.ForeignKey(OrdenCompra, on_delete=models.CASCADE, db_column='fo_orden')

    class Meta:
        db_table = 'item_orden'

    def __str__(self):
        return f'{self.descripcion_item} ({self.fo_orden})'


class ProveedorAutorizado(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_prov_aut')
    fo_mod_compras = models.ForeignKey(ModuloComprasInternas, on_delete=models.CASCADE, db_column='fo_mod_compras')
    fo_proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, db_column='fo_proveedor')

    class Meta:
        db_table = 'proveedor_autorizado'

    def __str__(self):
        return self.fo_proveedor.razon_social


class CotizacionCompra(models.Model):
    id = models.AutoField(primary_key=True)
    archivo = models.FileField(upload_to='cotizaciones_compra/')
    fecha_carga = models.DateTimeField(auto_now_add=True)
    fo_orden = models.ForeignKey(OrdenCompra, on_delete=models.CASCADE, db_column='fo_orden')

    class Meta:
        db_table = 'cotizacion_compra'

    def __str__(self):
        return f'Cotización de {self.fo_orden}'
