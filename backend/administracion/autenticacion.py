from rest_framework.exceptions import APIException
from rest_framework_simplejwt.views import TokenObtainPairView

from usuarios.models import Usuario

from . import auditoria


class TokenObtainPairAuditadoView(TokenObtainPairView):
    """Mismo login JWT de siempre (misma respuesta y códigos); además deja registro de inicios de sesión ok y fallidos."""

    def post(self, request, *args, **kwargs):
        correo = str(request.data.get('email', '') if hasattr(request.data, 'get') else '')[:150]
        try:
            respuesta = super().post(request, *args, **kwargs)
        except APIException:
            # Credenciales inválidas: se guarda solo el correo intentado, nunca la contraseña.
            auditoria.registrar(None, 'login_fallido', 'autenticacion', f'Intento de acceso con el correo {correo}', request)
            raise
        if respuesta.status_code == 200:
            usuario = Usuario.objects.filter(email=correo).first()
            auditoria.registrar(usuario, 'login_ok', 'autenticacion', f'Inicio de sesión de {correo}', request)
        return respuesta
