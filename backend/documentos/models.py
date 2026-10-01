from django.db import models

from administracion.models import SistemaTrainet
from usuarios.models import EncargadoDocumental, Usuario


class ModuloGestionDocumental(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_mod_doc')
    documentos_almacenados = models.IntegerField(default=0)
    fo_sistema = models.ForeignKey(SistemaTrainet, on_delete=models.CASCADE, db_column='fo_sistema')

    class Meta:
        db_table = 'modulo_gestion_documental'

    def __str__(self):
        return f'Módulo de gestión documental {self.id}'


class TipoDocumento(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_tipo_documento')
    nombre_tipo = models.CharField(max_length=255)

    class Meta:
        db_table = 'tipo_documento'

    def __str__(self):
        return self.nombre_tipo


class CategoriaDocumento(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_cat_doc')
    nombre_categoria = models.CharField(max_length=255)
    fo_mod_doc = models.ForeignKey(ModuloGestionDocumental, on_delete=models.CASCADE, db_column='fo_mod_doc')

    class Meta:
        db_table = 'categoria_documento'

    def __str__(self):
        return self.nombre_categoria


class Documento(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_documento')
    titulo = models.CharField(max_length=255)
    fecha_creacion = models.DateField(auto_now_add=True)
    version = models.CharField(max_length=255)
    archivo = models.FileField(upload_to='documentos/')
    tamanio = models.IntegerField(default=0)
    fo_tipo_documento = models.ForeignKey(TipoDocumento, on_delete=models.CASCADE, db_column='fo_tipo_documento')
    fo_mod_doc = models.ForeignKey(ModuloGestionDocumental, on_delete=models.CASCADE, db_column='fo_mod_doc')
    fo_categoria_documento = models.ForeignKey(CategoriaDocumento, on_delete=models.CASCADE, db_column='fo_categoria_documento')

    class Meta:
        db_table = 'documento'

    def save(self, *args, **kwargs):
        if self.archivo:
            self.tamanio = self.archivo.size
        super().save(*args, **kwargs)

    def __str__(self):
        return self.titulo


class HistorialAccesoDocumento(models.Model):
    ACCION_CHOICES = [
        ('consulta', 'Consulta'),
        ('descarga', 'Descarga'),
    ]

    id = models.AutoField(primary_key=True)
    accion = models.CharField(max_length=20, choices=ACCION_CHOICES)
    fecha = models.DateTimeField(auto_now_add=True)
    fo_documento = models.ForeignKey(Documento, on_delete=models.CASCADE, db_column='fo_documento')
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')

    class Meta:
        db_table = 'historial_acceso_documento'

    def __str__(self):
        return f'{self.fo_usuario.nombre} - {self.accion} - {self.fo_documento.titulo}'


class TipoDocumentoAcceso(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_tipo_doc')
    nombre_tipo = models.CharField(max_length=255)
    fo_enc_doc = models.ForeignKey(EncargadoDocumental, on_delete=models.CASCADE, db_column='fo_enc_doc')

    class Meta:
        db_table = 'tipo_documento_acceso'

    def __str__(self):
        return self.nombre_tipo


class CategoriaAccesoDoc(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_cat_acceso')
    nombre_categoria = models.CharField(max_length=255)
    fo_enc_doc = models.ForeignKey(EncargadoDocumental, on_delete=models.CASCADE, db_column='fo_enc_doc')

    class Meta:
        db_table = 'categoria_acceso_doc'

    def __str__(self):
        return self.nombre_categoria
