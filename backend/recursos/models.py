from django.db import models

from administracion.models import SistemaTrainet
from usuarios.models import Usuario


class ModuloPedidoRecursos(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_mod_pedido')
    presupuesto_asignado = models.IntegerField(default=0)
    fo_sistema = models.ForeignKey(SistemaTrainet, on_delete=models.CASCADE, db_column='fo_sistema')

    class Meta:
        db_table = 'modulo_pedido_recursos'

    def __str__(self):
        return f'Módulo de pedido de recursos {self.id}'


class TipoRecurso(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_tipo_recurso')
    nombre_tipo = models.CharField(max_length=255)
    disponible = models.BooleanField(default=True)

    class Meta:
        db_table = 'tipo_recurso'

    def __str__(self):
        return self.nombre_tipo


class SolicitudRecursos(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_solicitud')
    fecha_solicitud = models.DateField(auto_now_add=True)
    cantidad = models.IntegerField(default=0)
    justificacion = models.CharField(max_length=255)
    prioridad = models.CharField(max_length=255, choices=[
        ('alta', 'Alta'),
        ('media', 'Media'),
        ('baja', 'Baja'),
    ])
    estado = models.CharField(max_length=255, choices=[
        ('pendiente', 'Pendiente'),
        ('aprobado', 'Aprobado'),
        ('rechazado', 'Rechazado'),
        ('entregado', 'Entregado'),
    ])
    presupuesto_estimado = models.IntegerField(default=0)
    comentario_encargado = models.CharField(max_length=255, blank=True)
    archivo_entrega = models.FileField(upload_to='entregas_recursos/', blank=True, null=True)
    fo_tipo_recurso = models.ForeignKey(TipoRecurso, on_delete=models.CASCADE, db_column='fo_tipo_recurso')
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    fo_mod_pedido = models.ForeignKey(ModuloPedidoRecursos, on_delete=models.CASCADE, db_column='fo_mod_pedido')

    class Meta:
        db_table = 'solicitud_recursos'

    def __str__(self):
        return f'Solicitud #{self.id} - {self.fo_tipo_recurso.nombre_tipo} ({self.estado})'
