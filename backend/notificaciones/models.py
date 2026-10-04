from django.db import models

from usuarios.models import Usuario


class Notificacion(models.Model):
    id = models.AutoField(primary_key=True)
    mensaje = models.CharField(max_length=255)
    fecha = models.DateTimeField(auto_now_add=True)
    leida = models.BooleanField(default=False)
    # Ruta interna del frontend a la lista o pestaña del módulo notificado ('' = sin destino).
    ruta = models.CharField(max_length=120, blank=True, default='')
    fo_usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, db_column='fo_usuario')

    class Meta:
        db_table = 'notificacion'

    def __str__(self):
        return f'{self.fo_usuario.nombre} - {self.mensaje}'
