import logging

from django.core.mail import send_mail

from .models import Notificacion
from .rutas import ruta_valida

logger = logging.getLogger(__name__)


def notificar(usuario, mensaje_interno, asunto_correo, cuerpo_correo, ruta=''):
    """Guarda la notificación y envía el correo. `ruta` es opcional: una ruta interna a la lista o pestaña de
    un módulo al que el destinatario tenga acceso; si no es válida se guarda vacía (nunca lanza)."""
    Notificacion.objects.create(
        mensaje=mensaje_interno,
        fo_usuario=usuario,
        ruta=ruta_valida(ruta, usuario),
    )
    # Un fallo de correo no debe propagarse ni revertir la operación que notifica.
    try:
        send_mail(asunto_correo, cuerpo_correo, None, [usuario.email])
    except Exception:
        logger.exception('No se pudo enviar el correo de notificación a %s', usuario.email)
