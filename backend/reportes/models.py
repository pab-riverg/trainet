from django.db import models

from administracion.models import SistemaTrainet
from usuarios.models import Usuario


class ModuloReportes(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_mod_reportes')
    fo_sistema = models.ForeignKey(SistemaTrainet, on_delete=models.CASCADE, db_column='fo_sistema')

    class Meta:
        db_table = 'modulo_reportes'

    def __str__(self):
        return f'Módulo de reportes {self.id}'


class TipoReporte(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_tipo_reporte')
    nombre_tipo = models.CharField(max_length=255)
    fo_mod_reportes = models.ForeignKey(ModuloReportes, on_delete=models.CASCADE, db_column='fo_mod_reportes')

    class Meta:
        db_table = 'tipo_reporte'

    def __str__(self):
        return self.nombre_tipo


class FrecuenciaReporte(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_frecuencia')
    descripcion = models.CharField(max_length=255)
    fo_mod_reportes = models.ForeignKey(ModuloReportes, on_delete=models.CASCADE, db_column='fo_mod_reportes')

    class Meta:
        db_table = 'frecuencia_reporte'

    def __str__(self):
        return self.descripcion


class Reporte(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_reporte')
    titulo = models.CharField(max_length=255)
    fecha_generacion = models.DateField(auto_now_add=True)
    archivo_generado = models.FileField(upload_to='reportes_generados/', blank=True, null=True)
    fo_tipo_reporte = models.ForeignKey(TipoReporte, on_delete=models.CASCADE, db_column='fo_tipo_reporte')
    fo_mod_reportes = models.ForeignKey(ModuloReportes, on_delete=models.CASCADE, db_column='fo_mod_reportes')
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')

    class Meta:
        db_table = 'reporte'

    def __str__(self):
        return self.titulo


class DatoReporte(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_dato')
    descripcion_dato = models.CharField(max_length=255)
    archivo = models.FileField(upload_to='datos_reporte/')
    fo_reporte = models.ForeignKey(Reporte, on_delete=models.CASCADE, db_column='fo_reporte')

    class Meta:
        db_table = 'dato_reporte'

    def __str__(self):
        return self.descripcion_dato


class ParametroReporte(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_parametro')
    clave_parametro = models.CharField(max_length=255)
    valor_parametro = models.CharField(max_length=255)
    fo_reporte = models.ForeignKey(Reporte, on_delete=models.CASCADE, db_column='fo_reporte')

    class Meta:
        db_table = 'parametro_reporte'

    def __str__(self):
        return f'{self.clave_parametro} = {self.valor_parametro}'
