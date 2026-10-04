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


class CategoriaAsistente(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100, unique=True)
    icono = models.CharField(max_length=50, default='bi-chat-dots')
    orden = models.PositiveIntegerField(default=0)
    fo_mod_asistente = models.ForeignKey(ModuloAsistenteVirtual, on_delete=models.CASCADE, db_column='fo_mod_asistente')

    class Meta:
        db_table = 'categoria_asistente'
        ordering = ['orden', 'nombre']

    def __str__(self):
        return self.nombre


class ConsultaFrecuente(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_consulta')
    pregunta = models.CharField(max_length=255)
    respuesta = models.TextField()
    # Campo de texto original; se conserva por compatibilidad. La categoría vigente es fo_categoria.
    categoria = models.CharField(max_length=255, blank=True, default='')
    fo_categoria = models.ForeignKey(CategoriaAsistente, on_delete=models.SET_NULL, null=True, blank=True,
                                     db_column='fo_categoria')
    palabras_clave = models.CharField(max_length=255, blank=True, default='')
    archivo = models.FileField(upload_to='asistente/', blank=True, null=True)
    activa = models.BooleanField(default=True)
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
    # Lo que escribió el usuario, o la pregunta elegida del menú (la API lo expone como "texto").
    pregunta_usuario = models.CharField(max_length=300)
    origen = models.CharField(max_length=10, choices=[('texto', 'Texto'), ('menu', 'Menú')], default='texto')
    resuelta = models.BooleanField(default=False)
    util = models.BooleanField(null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    # La respuesta dada (la API la expone como "consulta").
    fo_consulta_frecuente = models.ForeignKey(ConsultaFrecuente, on_delete=models.SET_NULL, db_column='fo_consulta_frecuente', blank=True, null=True)

    class Meta:
        db_table = 'historial_consulta'

    def __str__(self):
        return f'{self.fo_usuario.nombre} - {self.pregunta_usuario}'
