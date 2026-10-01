from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from usuarios.permissions import permiso_por_roles

from .models import DocumentoInstitucional
from .serializers import DocumentoInstitucionalSerializer


class DocumentoInstitucionalViewSet(viewsets.ModelViewSet):
    queryset = DocumentoInstitucional.objects.all()
    serializer_class = DocumentoInstitucionalSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'encargado_administrativo')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(fo_usuario=self.request.user)
