from django.db import models

from administracion.models import SistemaTrainet
from usuarios.models import Usuario


class ModuloAsistenteVirtual(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_mod_asistente')
    fo_sistema = models.ForeignKey(SistemaTrainet, on_delete=models.CASCADE, db_column='fo_sistema')

    class Meta:
        db_table = 'modulo_asistente_virtual'

    def __str__(self):
        return f'Módulo de asistente virtual {self.id}'


class ConsultaFrecuente(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_consulta')
    pregunta = models.CharField(max_length=255)
    respuesta = models.CharField(max_length=255)
    categoria = models.CharField(max_length=255)
    archivo = models.FileField(upload_to='respuestas_asistente/', blank=True, null=True)
    fo_mod_asistente = models.ForeignKey(ModuloAsistenteVirtual, on_delete=models.CASCADE, db_column='fo_mod_asistente')

    class Meta:
        db_table = 'consulta_frecuente'

    def __str__(self):
        return self.pregunta


class BaseConocimiento(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_base')
    tema = models.CharField(max_length=255)
    contenido = models.CharField(max_length=255)
    fo_mod_asistente = models.ForeignKey(ModuloAsistenteVirtual, on_delete=models.CASCADE, db_column='fo_mod_asistente')

    class Meta:
        db_table = 'base_conocimiento'

    def __str__(self):
        return self.tema


class HistorialConsulta(models.Model):
    id = models.AutoField(primary_key=True)
    pregunta_usuario = models.CharField(max_length=255)
    fecha = models.DateTimeField(auto_now_add=True)
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    fo_consulta_frecuente = models.ForeignKey(ConsultaFrecuente, on_delete=models.CASCADE, db_column='fo_consulta_frecuente', blank=True, null=True)

    class Meta:
        db_table = 'historial_consulta'

    def __str__(self):
        return f'{self.fo_usuario.nombre} - {self.pregunta_usuario}'
