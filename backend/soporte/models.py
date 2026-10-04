from django.db import models

from administracion.models import SistemaTrainet
from usuarios.models import TecnicoSoporte, Usuario


class ModuloSoporteTecnico(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_mod_soporte')
    tiempo_respuesta = models.IntegerField(default=0)
    fo_sistema = models.ForeignKey(SistemaTrainet, on_delete=models.CASCADE, db_column='fo_sistema')

    class Meta:
        db_table = 'modulo_soporte_tecnico'

    def __str__(self):
        return f'Módulo de soporte técnico {self.id}'


class CategoriaTicket(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_cat_ticket')
    nombre_categoria = models.CharField(max_length=255)

    class Meta:
        db_table = 'categoria_ticket'

    def __str__(self):
        return self.nombre_categoria


class TicketSoporte(models.Model):
    ESTADO_CHOICES = [
        ('abierto', 'Abierto'),
        ('en_proceso', 'En proceso'),
        ('resuelto', 'Resuelto'),
        ('cerrado', 'Cerrado'),
    ]
    PRIORIDAD_CHOICES = [
        ('baja', 'Baja'),
        ('media', 'Media'),
        ('alta', 'Alta'),
        ('urgente', 'Urgente'),
    ]

    id = models.AutoField(primary_key=True, db_column='id_ticket')
    fecha_creacion = models.DateField(auto_now_add=True)
    prioridad = models.CharField(max_length=255, choices=PRIORIDAD_CHOICES, default='media')
    descripcion = models.CharField(max_length=255)
    estado = models.CharField(max_length=255, choices=ESTADO_CHOICES, default='abierto')
    observaciones = models.TextField(blank=True, default='')
    fecha_resolucion = models.DateField(null=True, blank=True)
    tiempo_resolucion = models.IntegerField(default=0)
    fo_categoria_ticket = models.ForeignKey(CategoriaTicket, on_delete=models.CASCADE, db_column='fo_categoria_ticket')
    fo_tecnico = models.ForeignKey(TecnicoSoporte, on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_tecnico')
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    fo_mod_soporte = models.ForeignKey(ModuloSoporteTecnico, on_delete=models.CASCADE, db_column='fo_mod_soporte')

    class Meta:
        db_table = 'ticket_soporte'

    def __str__(self):
        return f'Ticket #{self.id} - {self.descripcion}'


class EvidenciaTicket(models.Model):
    id = models.AutoField(primary_key=True)
    archivo = models.FileField(upload_to='evidencias_ticket/')
    fecha_subida = models.DateTimeField(auto_now_add=True)
    fo_ticket = models.ForeignKey(TicketSoporte, on_delete=models.CASCADE, db_column='fo_ticket')

    class Meta:
        db_table = 'evidencia_ticket'

    def __str__(self):
        return f'Evidencia de {self.fo_ticket}'


class HerramientaTecnico(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_herramienta_manejo')
    nombre_herramienta = models.CharField(max_length=255)
    fo_tecnico = models.ForeignKey(TecnicoSoporte, on_delete=models.CASCADE, db_column='fo_tecnico')

    class Meta:
        db_table = 'herramienta_tecnico'

    def __str__(self):
        return self.nombre_herramienta


class SolicitudComun(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_sol_comun')
    descripcion = models.CharField(max_length=255)
    fo_mod_soporte = models.ForeignKey(ModuloSoporteTecnico, on_delete=models.CASCADE, db_column='fo_mod_soporte')

    class Meta:
        db_table = 'solicitud_comun'

    def __str__(self):
        return self.descripcion
