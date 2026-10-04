from django.core.validators import MinValueValidator
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
    # Las cotizaciones del flujo antiguo cuelgan de una orden; las nuevas, de una solicitud.
    fo_orden = models.ForeignKey(OrdenCompra, on_delete=models.CASCADE, db_column='fo_orden', null=True, blank=True)
    fo_solicitud = models.ForeignKey(
        'SolicitudCompra', on_delete=models.CASCADE, null=True, blank=True, db_column='fo_solicitud',
        related_name='cotizaciones'
    )
    fo_proveedor = models.ForeignKey(
        Proveedor, on_delete=models.PROTECT, null=True, blank=True, db_column='fo_proveedor',
        related_name='cotizaciones_compra'
    )
    # Monto total de la cotización; ya incluye el IVA.
    monto_total = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(1)])
    # Informativo.
    iva = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    fo_usuario = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_usuario',
        related_name='cotizaciones_compra_cargadas'
    )

    class Meta:
        db_table = 'cotizacion_compra'

    def __str__(self):
        return f'Cotización #{self.id}'


class CategoriaArticulo(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_categoria_articulo')
    nombre = models.CharField(max_length=100, unique=True)
    # Clase de Bootstrap Icons (p. ej. 'bi-laptop').
    icono = models.CharField(max_length=50, default='bi-box-seam')
    # El vínculo vive en compras para no crear una dependencia circular con proveedores.
    proveedores = models.ManyToManyField(Proveedor, blank=True, related_name='categorias_articulo')

    class Meta:
        db_table = 'categoria_articulo'

    def __str__(self):
        return self.nombre


class Articulo(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_articulo')
    nombre = models.CharField(max_length=255)
    descripcion = models.CharField(max_length=255, blank=True, default='')
    precio_referencia = models.IntegerField(default=0, validators=[MinValueValidator(0)])
    disponible = models.BooleanField(default=True)
    imagen = models.FileField(upload_to='articulos/', blank=True, null=True)
    fo_categoria = models.ForeignKey(CategoriaArticulo, on_delete=models.PROTECT, db_column='fo_categoria')
    fo_mod_compras = models.ForeignKey(ModuloComprasInternas, on_delete=models.CASCADE, db_column='fo_mod_compras')

    class Meta:
        db_table = 'articulo'

    def __str__(self):
        return self.nombre


class SolicitudCompra(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
        ('comprada', 'Comprada'),
        ('entregada', 'Entregada'),
        ('en_revision', 'En revisión'),
        ('recibida', 'Recibida'),
    ]

    id = models.AutoField(primary_key=True, db_column='id_solicitud_compra')
    fecha_solicitud = models.DateField(auto_now_add=True)
    area = models.CharField(max_length=255)
    nota = models.TextField(blank=True, default='')
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    total_estimado = models.IntegerField(default=0)
    motivo_decision = models.TextField(blank=True, default='')
    fecha_decision = models.DateTimeField(null=True, blank=True)
    fo_solicitante = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_solicitante', related_name='solicitudes_compra')
    fo_aprobador = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_aprobador',
        related_name='solicitudes_compra_decididas'
    )
    fo_mod_compras = models.ForeignKey(ModuloComprasInternas, on_delete=models.CASCADE, db_column='fo_mod_compras')

    # Compra
    fecha_compra = models.DateTimeField(null=True, blank=True)
    fo_comprador = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_comprador',
        related_name='solicitudes_compra_confirmadas'
    )
    fo_cotizacion_elegida = models.ForeignKey(
        'CotizacionCompra', on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_cotizacion_elegida',
        related_name='+'
    )
    fo_orden = models.ForeignKey(
        OrdenCompra, on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_orden', related_name='+'
    )
    # Entrega y recepción
    fecha_entrega = models.DateTimeField(null=True, blank=True)
    fo_entregado_por = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_entregado_por',
        related_name='solicitudes_compra_entregadas'
    )
    fecha_confirmacion = models.DateTimeField(null=True, blank=True)
    # Reclamo
    motivo_reclamo = models.TextField(blank=True, default='')
    fecha_reclamo = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'solicitud_compra'

    def __str__(self):
        return f'Solicitud de compra #{self.id} ({self.estado})'


class ItemSolicitud(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_item_solicitud')
    cantidad = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    # Precio de referencia del artículo al momento de pedir.
    precio_unitario = models.IntegerField(default=0)
    justificacion = models.TextField(blank=True, default='')
    fo_solicitud = models.ForeignKey(SolicitudCompra, on_delete=models.CASCADE, db_column='fo_solicitud', related_name='items')
    fo_articulo = models.ForeignKey(Articulo, on_delete=models.PROTECT, db_column='fo_articulo')

    class Meta:
        db_table = 'item_solicitud'

    def __str__(self):
        return f'{self.cantidad} x {self.fo_articulo}'


class FacturaCompra(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_factura_compra')
    archivo = models.FileField(upload_to='facturas_compra/')
    descripcion = models.CharField(max_length=255, blank=True, default='')
    fecha_carga = models.DateTimeField(auto_now_add=True)
    fo_solicitud = models.ForeignKey(SolicitudCompra, on_delete=models.CASCADE, db_column='fo_solicitud', related_name='facturas')
    fo_usuario = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_usuario',
        related_name='facturas_compra_cargadas'
    )

    class Meta:
        db_table = 'factura_compra'

    def __str__(self):
        return f'Factura #{self.id} de la solicitud {self.fo_solicitud_id}'


class EventoSolicitud(models.Model):
    """Bitácora de una solicitud de compra."""

    TIPO_CHOICES = [
        ('creada', 'Creada'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
        ('comprada', 'Comprada'),
        ('entregada', 'Entregada'),
        ('recibida', 'Recibida'),
        ('no_recibida', 'Reportada como no recibida'),
        ('reentregada', 'Reentregada'),
        ('observacion', 'Observación'),
    ]

    id = models.AutoField(primary_key=True, db_column='id_evento_solicitud')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    detalle = models.TextField(blank=True, default='')
    fecha = models.DateTimeField(auto_now_add=True)
    fo_solicitud = models.ForeignKey(SolicitudCompra, on_delete=models.CASCADE, db_column='fo_solicitud', related_name='historial')
    fo_usuario = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_usuario',
        related_name='eventos_solicitud_compra'
    )

    class Meta:
        db_table = 'evento_solicitud'
        ordering = ['fecha', 'id']

    def __str__(self):
        return f'{self.tipo} - solicitud {self.fo_solicitud_id}'
