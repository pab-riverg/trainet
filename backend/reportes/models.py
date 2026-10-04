from django.db import models
from django.utils import timezone

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
    ORIGEN_CHOICES = [('archivo', 'Archivo importado'), ('sistema', 'Datos del sistema')]

    nombre_tipo = models.CharField(max_length=255)
    # 'archivo' = categoría para archivos importados; 'sistema' = reportes generados con datos de TRAINET.
    origen = models.CharField(max_length=10, choices=ORIGEN_CHOICES, default='sistema')
    # Identificador estable de los tipos de informe de sistema (soporte, recursos, compras…).
    clave = models.CharField(max_length=30, null=True, blank=True, unique=True)
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
    titulo = models.CharField(max_length=255, blank=True)
    fecha_generacion = models.DateField(auto_now_add=True)
    archivo_generado = models.FileField(upload_to='reportes_generados/', blank=True, null=True)
    fo_tipo_reporte = models.ForeignKey(TipoReporte, on_delete=models.CASCADE, db_column='fo_tipo_reporte')
    fo_mod_reportes = models.ForeignKey(ModuloReportes, on_delete=models.CASCADE, db_column='fo_mod_reportes')
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.SET_NULL, null=True, blank=True, db_column='fo_usuario')
    # Instantánea del informe (JSON como texto, compatible con cualquier motor): parámetros usados y contenido generado.
    parametros = models.TextField(blank=True, default='{}')
    contenido = models.TextField(blank=True, default='{}')
    # Archivos importados que alimentan un informe consolidado.
    archivos = models.ManyToManyField('ArchivoImportado', blank=True, related_name='informes')

    class Meta:
        db_table = 'reporte'
        ordering = ['-fecha_generacion', '-id']

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


class ArchivoImportado(models.Model):
    FORMATO_CHOICES = [('csv', 'CSV'), ('xlsx', 'XLSX')]

    id = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField(blank=True, default='')
    archivo = models.FileField(upload_to='reportes/importados/')
    formato = models.CharField(max_length=4, choices=FORMATO_CHOICES)
    fo_tipo = models.ForeignKey(TipoReporte, on_delete=models.PROTECT, db_column='fo_tipo')
    # Fecha a la que corresponde el contenido (no la de la importación).
    fecha_documento = models.DateField(default=timezone.localdate)
    fecha_importacion = models.DateTimeField(auto_now_add=True)
    filas = models.PositiveIntegerField(default=0)
    columnas = models.PositiveIntegerField(default=0)
    # Lista de encabezados serializada como JSON (texto, compatible con cualquier motor).
    encabezados = models.TextField(blank=True, default='[]')
    # SHA-256 del contenido: evita importar dos veces el mismo archivo.
    huella = models.CharField(max_length=64, unique=True)
    # False = archivado.
    activo = models.BooleanField(default=True)
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    fo_mod_reportes = models.ForeignKey(ModuloReportes, on_delete=models.CASCADE, db_column='fo_mod_reportes')

    class Meta:
        db_table = 'archivo_importado'
        ordering = ['-fecha_documento', '-id']

    def __str__(self):
        return self.titulo
