from django.db import models

from administracion.models import SistemaTrainet
from usuarios.models import Usuario


class ModuloGestionProveedores(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_mod_prov')
    fo_sistema = models.ForeignKey(SistemaTrainet, on_delete=models.CASCADE, db_column='fo_sistema')

    class Meta:
        db_table = 'modulo_gestion_proveedores'

    def __str__(self):
        return f'Módulo de gestión de proveedores {self.id}'


class Proveedor(models.Model):
    ESTADO_CHOICES = [
        ('sin_contratar', 'Sin contratar'),
        ('contratado', 'Contratado'),
        ('inactivo', 'Inactivo'),
    ]

    id = models.AutoField(primary_key=True, db_column='id_proveedor')
    razon_social = models.CharField(max_length=255)
    contacto = models.CharField(max_length=255)
    email = models.CharField(max_length=255)
    telefono = models.CharField(max_length=255)
    calificacion = models.IntegerField(default=0)
    rut = models.CharField(max_length=50)
    especialidad = models.CharField(max_length=255)
    estado = models.CharField(max_length=30, choices=ESTADO_CHOICES, default='sin_contratar')
    fo_mod_prov = models.ForeignKey(ModuloGestionProveedores, on_delete=models.CASCADE, db_column='fo_mod_prov')

    class Meta:
        db_table = 'proveedor'

    def __str__(self):
        return self.razon_social


class ServicioProveedor(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_servicio')
    nombre_servicio = models.CharField(max_length=255)
    fo_proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, db_column='fo_proveedor')

    class Meta:
        db_table = 'servicio_proveedor'

    def __str__(self):
        return self.nombre_servicio


class ContratoProveedor(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_contrato')
    descripcion = models.CharField(max_length=255)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    estado = models.CharField(max_length=50, default='pendiente_aprobacion', choices=[
        ('pendiente_aprobacion', 'Pendiente de aprobación'),
        ('vigente', 'Vigente'),
        ('finalizado', 'Finalizado'),
        ('cancelado', 'Cancelado'),
        ('rechazado', 'Rechazado'),
    ])
    confirmacion = models.CharField(max_length=255, blank=True, default='')
    motivo_decision = models.TextField(blank=True, default='')
    fecha_decision = models.DateTimeField(null=True, blank=True)
    archivo = models.FileField(upload_to='contratos_proveedor/', blank=True, null=True)
    fo_proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, db_column='fo_proveedor')
    fo_cotizacion = models.ForeignKey('CotizacionProveedor', on_delete=models.PROTECT, null=True, blank=True, db_column='fo_cotizacion')
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_usuario')
    fo_aprobador = models.ForeignKey(
        Usuario, on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_aprobador',
        related_name='contratos_decididos'
    )

    class Meta:
        db_table = 'contrato_proveedor'

    def __str__(self):
        return f'Contrato #{self.id} - {self.fo_proveedor.razon_social}'


class NecesidadCapacitacionExterna(models.Model):
    id = models.AutoField(primary_key=True)
    tema = models.CharField(max_length=255)
    area = models.CharField(max_length=255)
    fecha = models.DateField(auto_now_add=True)
    observaciones = models.CharField(max_length=255, blank=True)
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    fo_mod_prov = models.ForeignKey(ModuloGestionProveedores, on_delete=models.CASCADE, db_column='fo_mod_prov')

    class Meta:
        db_table = 'necesidad_capacitacion_externa'

    def __str__(self):
        return f'{self.tema} - {self.area}'


class CotizacionProveedor(models.Model):
    ESTADO_CHOICES = [
        ('pendiente', 'Pendiente'),
        ('aprobada', 'Aprobada'),
        ('rechazada', 'Rechazada'),
    ]

    id = models.AutoField(primary_key=True)
    archivo = models.FileField(upload_to='cotizaciones_proveedor/')
    fecha_carga = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='pendiente')
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_usuario')
    fo_proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, db_column='fo_proveedor')

    class Meta:
        db_table = 'cotizacion_proveedor'

    def __str__(self):
        return f'Cotización de {self.fo_proveedor.razon_social}'


class EvaluacionProveedor(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_evaluacion_calidad')
    puntuacion = models.IntegerField(default=0)
    fecha_evaluacion = models.DateField()
    fo_proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, db_column='fo_proveedor')

    class Meta:
        db_table = 'evaluacion_proveedor'

    def __str__(self):
        return f'Evaluación de {self.fo_proveedor.razon_social} ({self.puntuacion})'
