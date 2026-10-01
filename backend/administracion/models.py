from django.db import models

from usuarios.models import Administrador, Directivo, EncargadoAdministrativo, Usuario


class SistemaTrainet(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_sistema')
    version = models.CharField(max_length=255)
    fecha_instalacion = models.DateField()

    class Meta:
        db_table = 'sistema_trainet'

    def __str__(self):
        return self.version


class ModuloAdministracion(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_mod_admin')
    fo_sistema = models.ForeignKey(SistemaTrainet, on_delete=models.CASCADE, db_column='fo_sistema')

    class Meta:
        db_table = 'modulo_administracion'

    def __str__(self):
        return f'Módulo de administración {self.id}'


class Configuracion(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_configuracion')
    clave = models.CharField(max_length=255)
    valor = models.CharField(max_length=255)
    fo_sistema = models.ForeignKey(SistemaTrainet, on_delete=models.CASCADE, db_column='fo_sistema')

    class Meta:
        db_table = 'configuracion'

    def __str__(self):
        return self.clave


class ConfiguracionSistema(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_configuracion_sistema')
    clave = models.CharField(max_length=255)
    valor = models.CharField(max_length=255)
    fo_mod_admin = models.ForeignKey(ModuloAdministracion, on_delete=models.CASCADE, db_column='fo_mod_admin')

    class Meta:
        db_table = 'configuracion_sistema'

    def __str__(self):
        return self.clave


class ModuloActivo(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_modulo_activo')
    nombre_modulo = models.CharField(max_length=255)
    fo_sistema = models.ForeignKey(SistemaTrainet, on_delete=models.CASCADE, db_column='fo_sistema')

    class Meta:
        db_table = 'modulo_activo'

    def __str__(self):
        return self.nombre_modulo


class LogAuditoria(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_log_auditoria')
    descripcion = models.CharField(max_length=255)
    fecha_evento = models.DateField(auto_now_add=True)
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')
    fo_mod_admin = models.ForeignKey(ModuloAdministracion, on_delete=models.CASCADE, db_column='fo_mod_admin')

    class Meta:
        db_table = 'log_auditoria'

    def __str__(self):
        return self.descripcion


class Permiso(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_permiso')
    nombre_permiso = models.CharField(max_length=255)
    fo_administrador = models.ForeignKey(Administrador, on_delete=models.CASCADE, db_column='fo_administrador')

    class Meta:
        db_table = 'permiso'

    def __str__(self):
        return self.nombre_permiso


class ModuloAcceso(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_modulo_acceso')
    nombre_modulo = models.CharField(max_length=255)
    fo_administrador = models.ForeignKey(Administrador, on_delete=models.CASCADE, db_column='fo_administrador')

    class Meta:
        db_table = 'modulo_acceso'

    def __str__(self):
        return self.nombre_modulo


class AreasResponsabilidad(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_area')
    nombre_area = models.CharField(max_length=255)
    fo_directivo = models.ForeignKey(Directivo, on_delete=models.CASCADE, db_column='fo_directivo')

    class Meta:
        db_table = 'areas_responsabilidad'

    def __str__(self):
        return self.nombre_area


class ProcesoCargo(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_proceso')
    nombre_proceso = models.CharField(max_length=255)
    fo_enc_admin = models.ForeignKey(EncargadoAdministrativo, on_delete=models.CASCADE, db_column='fo_enc_admin')

    class Meta:
        db_table = 'proceso_cargo'

    def __str__(self):
        return self.nombre_proceso


class DocumentoInstitucional(models.Model):
    id = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=255)
    descripcion = models.CharField(max_length=255, blank=True)
    archivo = models.FileField(upload_to='documentos_institucionales/')
    fecha_subida = models.DateTimeField(auto_now_add=True)
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')

    class Meta:
        db_table = 'documento_institucional'

    def __str__(self):
        return self.titulo
