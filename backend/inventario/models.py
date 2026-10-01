from django.db import models

from administracion.models import SistemaTrainet


class ModuloInventarioContenido(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_mod_inv')
    fo_sistema = models.ForeignKey(SistemaTrainet, on_delete=models.CASCADE, db_column='fo_sistema')

    class Meta:
        db_table = 'modulo_inventario_contenido'

    def __str__(self):
        return f'Módulo de inventario de contenido {self.id}'


class CategoriaContenido(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_cat_cont')
    nombre_categoria = models.CharField(max_length=255)

    class Meta:
        db_table = 'categoria_contenido'

    def __str__(self):
        return self.nombre_categoria


class EstadoContenido(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_estado_cont')
    nombre_estado = models.CharField(max_length=255)

    class Meta:
        db_table = 'estado_contenido'

    def __str__(self):
        return self.nombre_estado


class Contenido(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_contenido')
    nombre_contenido = models.CharField(max_length=255)
    tipo_contenido = models.CharField(max_length=50, choices=[
        ('video', 'Video'),
        ('pdf', 'PDF'),
        ('presentacion', 'Presentación'),
        ('manual', 'Manual'),
        ('otro', 'Otro'),
    ])
    archivo = models.FileField(upload_to='inventario_contenido/')
    fecha_creacion = models.DateField(auto_now_add=True)
    fecha_actualizacion = models.DateField(auto_now=True)
    fo_categoria_cont = models.ForeignKey(CategoriaContenido, on_delete=models.CASCADE, db_column='fo_categoria_cont')
    fo_estado_cont = models.ForeignKey(EstadoContenido, on_delete=models.CASCADE, db_column='fo_estado_cont')
    fo_mod_inv = models.ForeignKey(ModuloInventarioContenido, on_delete=models.CASCADE, db_column='fo_mod_inv')

    class Meta:
        db_table = 'contenido'

    def __str__(self):
        return self.nombre_contenido
