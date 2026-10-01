from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from usuarios.permissions import permiso_por_roles

from .models import SolicitudRecursos, TipoRecurso
from .serializers import (
    SolicitudRecursosCreateSerializer,
    SolicitudRecursosSerializer,
    TipoRecursoSerializer,
)


class TipoRecursoViewSet(viewsets.ModelViewSet):
    queryset = TipoRecurso.objects.all()
    serializer_class = TipoRecursoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('encargado_formacion', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class SolicitudRecursosViewSet(viewsets.ModelViewSet):
    queryset = SolicitudRecursos.objects.all()
    serializer_class = SolicitudRecursosSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return SolicitudRecursosCreateSerializer
        return SolicitudRecursosSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('encargado_formacion', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_usuario = self.request.query_params.get('fo_usuario')
        estado = self.request.query_params.get('estado')
        if fo_usuario:
            queryset = queryset.filter(fo_usuario=fo_usuario)
        if estado:
            queryset = queryset.filter(estado=estado)
        return queryset

    def perform_create(self, serializer):
        serializer.save(fo_usuario=self.request.user, estado='pendiente')
