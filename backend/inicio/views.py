from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from administracion import configuracion
from usuarios.models import Usuario

from .modulos import modulos_visibles
from .tarjetas import construir_tarjetas

ETIQUETAS_ROL = dict(Usuario.ROL_CHOICES)


class InicioView(APIView):
    """GET /api/inicio/: datos de la página Inicio del usuario autenticado (solo lectura).

    Devuelve {usuario, nombre_equipo, modulos, tarjetas}; el contrato de las tarjetas está en inicio/estructuras.py.
    No incluye cédula, teléfono ni otros datos personales.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        usuario = request.user
        return Response({
            'usuario': {'nombre': usuario.nombre, 'rol': usuario.rol, 'rol_nombre': ETIQUETAS_ROL.get(usuario.rol, usuario.rol)},
            'nombre_equipo': configuracion.obtener('nombre_equipo'),
            'modulos': modulos_visibles(usuario.rol),
            'tarjetas': construir_tarjetas(usuario),
        })
