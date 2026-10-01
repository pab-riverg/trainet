from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from usuarios.permissions import permiso_por_roles

from .models import BaseConocimiento, ConsultaFrecuente, HistorialConsulta
from .serializers import (
    BaseConocimientoSerializer,
    ConsultaFrecuenteSerializer,
    HistorialConsultaSerializer,
)


class ConsultaFrecuenteViewSet(viewsets.ModelViewSet):
    queryset = ConsultaFrecuente.objects.all()
    serializer_class = ConsultaFrecuenteSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'supervisor')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    @action(detail=False, methods=['post'])
    def preguntar(self, request):
        texto = request.data.get('pregunta', '')
        coincidencia = ConsultaFrecuente.objects.filter(pregunta__icontains=texto).first()
        HistorialConsulta.objects.create(
            pregunta_usuario=texto,
            fo_usuario=request.user,
            fo_consulta_frecuente=coincidencia,
        )
        if coincidencia:
            serializer = ConsultaFrecuenteSerializer(coincidencia)
            return Response(serializer.data)
        return Response(
            {'respuesta': 'No se encontró una respuesta para tu pregunta.'},
            status=status.HTTP_404_NOT_FOUND,
        )


class BaseConocimientoViewSet(viewsets.ModelViewSet):
    queryset = BaseConocimiento.objects.all()
    serializer_class = BaseConocimientoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'supervisor')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class HistorialConsultaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistorialConsulta.objects.all()
    serializer_class = HistorialConsultaSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('administrador')]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_usuario = self.request.query_params.get('fo_usuario')
        if fo_usuario:
            queryset = queryset.filter(fo_usuario=fo_usuario)
        return queryset
