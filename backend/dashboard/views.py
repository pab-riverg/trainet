from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from reportes.generadores import general
from reportes.views import rango_de_fechas
from usuarios.permissions import permiso_por_roles

from .permisos import ROLES_DASHBOARD


class DashboardView(APIView):
    """GET /api/dashboard/: indicadores gerenciales (solo administrador y directivo).

    Reutiliza el generador del informe "general" y devuelve su `contenido` (indicadores, secciones, graficos).
    Es una lectura: no crea informes ni escribe en la bitácora. Periodo opcional con ?desde= y ?hasta=
    (AAAA-MM-DD, máximo 366 días; sin fechas, los últimos 30 días).
    """

    def get_permissions(self):
        return [IsAuthenticated(), permiso_por_roles(*ROLES_DASHBOARD)()]

    def get(self, request):
        desde, hasta = rango_de_fechas(request.query_params)
        return Response(general.generar(desde, hasta))
