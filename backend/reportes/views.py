from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from usuarios.permissions import permiso_por_roles

from .models import (
    DatoReporte,
    FrecuenciaReporte,
    ParametroReporte,
    Reporte,
    TipoReporte,
)
from .serializers import (
    DatoReporteSerializer,
    FrecuenciaReporteSerializer,
    ParametroReporteSerializer,
    ReporteSerializer,
    TipoReporteSerializer,
)


class TipoReporteViewSet(viewsets.ModelViewSet):
    queryset = TipoReporte.objects.all()
    serializer_class = TipoReporteSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'directivo')]


class FrecuenciaReporteViewSet(viewsets.ModelViewSet):
    queryset = FrecuenciaReporte.objects.all()
    serializer_class = FrecuenciaReporteSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'directivo')]


class ReporteViewSet(viewsets.ModelViewSet):
    queryset = Reporte.objects.all()
    serializer_class = ReporteSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'directivo')]

    def perform_create(self, serializer):
        serializer.save(fo_usuario=self.request.user)


class DatoReporteViewSet(viewsets.ModelViewSet):
    queryset = DatoReporte.objects.all()
    serializer_class = DatoReporteSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'directivo')]


class ParametroReporteViewSet(viewsets.ModelViewSet):
    queryset = ParametroReporte.objects.all()
    serializer_class = ParametroReporteSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'directivo')]
