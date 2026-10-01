from django.db import models

from administracion.models import SistemaTrainet
from usuarios.models import Capacitador, Empleado


class ModuloCapacitacion(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_mod_cap')
    participantes_activos = models.IntegerField(default=0)
    fo_sistema = models.ForeignKey(SistemaTrainet, on_delete=models.CASCADE, db_column='fo_sistema')

    class Meta:
        db_table = 'modulo_capacitacion'

    def __str__(self):
        return f'Módulo de capacitación {self.id}'


class CategoriaCurso(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_categoria_curso')
    nombre_categoria = models.CharField(max_length=255)

    class Meta:
        db_table = 'categoria_curso'

    def __str__(self):
        return self.nombre_categoria


class Curso(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_curso')
    titulo = models.CharField(max_length=255)
    descripcion = models.CharField(max_length=255)
    duracion = models.IntegerField(default=0)
    fecha_creacion = models.DateField(auto_now_add=True)
    estado = models.CharField(max_length=255)
    video_url = models.URLField(blank=True, null=True)
    fo_categoria_curso = models.ForeignKey(CategoriaCurso, on_delete=models.CASCADE, db_column='fo_categoria_curso')
    fo_mod_cap = models.ForeignKey(ModuloCapacitacion, on_delete=models.CASCADE, db_column='fo_mod_cap')

    class Meta:
        db_table = 'curso'

    def __str__(self):
        return self.titulo


class Capacitacion(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_capacitacion')
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    modalidad = models.CharField(max_length=255)
    fo_instructor = models.ForeignKey(Capacitador, on_delete=models.CASCADE, db_column='fo_instructor')
    fo_mod_cap = models.ForeignKey(ModuloCapacitacion, on_delete=models.CASCADE, db_column='fo_mod_cap')
    fo_curso = models.ForeignKey(Curso, on_delete=models.CASCADE, db_column='fo_curso')

    class Meta:
        db_table = 'capacitacion'

    def __str__(self):
        return f'{self.fo_curso.titulo} ({self.fecha_inicio} - {self.fecha_fin})'


class ParticipanteCapacitacion(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_part_cap')
    asistio = models.BooleanField(default=False)
    fo_capacitacion = models.ForeignKey(Capacitacion, on_delete=models.CASCADE, db_column='fo_capacitacion')
    fo_empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, db_column='fo_empleado')

    class Meta:
        db_table = 'participante_capacitacion'

    def __str__(self):
        return f'{self.fo_empleado.fo_usuario.nombre} - {self.fo_capacitacion}'


class ProgresoCurso(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_progreso')
    porcentaje = models.IntegerField(default=0)
    fo_empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, db_column='fo_empleado')
    fo_curso = models.ForeignKey(Curso, on_delete=models.CASCADE, db_column='fo_curso')

    class Meta:
        db_table = 'progreso_curso'

    def __str__(self):
        return f'{self.fo_empleado.fo_usuario.nombre} - {self.fo_curso.titulo} ({self.porcentaje}%)'


class MaterialEducativo(models.Model):
    id = models.AutoField(primary_key=True)
    titulo = models.CharField(max_length=255)
    archivo = models.FileField(upload_to='materiales_educativos/')
    fecha_subida = models.DateTimeField(auto_now_add=True)
    fo_curso = models.ForeignKey(Curso, on_delete=models.CASCADE, db_column='fo_curso')

    class Meta:
        db_table = 'material_educativo'

    def __str__(self):
        return self.titulo


class EvidenciaParticipacion(models.Model):
    id = models.AutoField(primary_key=True)
    archivo = models.FileField(upload_to='evidencias_participacion/')
    fecha_subida = models.DateTimeField(auto_now_add=True)
    fo_participante = models.ForeignKey(ParticipanteCapacitacion, on_delete=models.CASCADE, db_column='fo_participante')

    class Meta:
        db_table = 'evidencia_participacion'

    def __str__(self):
        return f'Evidencia de {self.fo_participante}'


class CursosImpartidos(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_cursos_impartidos')
    fo_capacitador = models.ForeignKey(Capacitador, on_delete=models.CASCADE, db_column='fo_capacitador')
    fo_curso = models.ForeignKey(Curso, on_delete=models.CASCADE, db_column='fo_curso')

    class Meta:
        db_table = 'cursos_impartidos'

    def __str__(self):
        return f'{self.fo_capacitador.fo_usuario.nombre} - {self.fo_curso.titulo}'
