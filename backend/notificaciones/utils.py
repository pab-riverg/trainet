from django.core.mail import send_mail

from .models import Notificacion


def notificar(usuario, mensaje_interno, asunto_correo, cuerpo_correo):
    Notificacion.objects.create(
        mensaje=mensaje_interno,
        fo_usuario=usuario,
    )
    send_mail(asunto_correo, cuerpo_correo, None, [usuario.email])
