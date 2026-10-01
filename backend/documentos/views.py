import os

from django.http import FileResponse
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from usuarios.permissions import permiso_por_roles

from .models import Documento, HistorialAccesoDocumento
from .serializers import DocumentoSerializer, HistorialAccesoDocumentoSerializer


class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = Documento.objects.all()
    serializer_class = DocumentoSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['titulo']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('encargado_documental', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_tipo_documento = self.request.query_params.get('fo_tipo_documento')
        fo_categoria_documento = self.request.query_params.get('fo_categoria_documento')
        fecha_creacion = self.request.query_params.get('fecha_creacion')
        if fo_tipo_documento:
            queryset = queryset.filter(fo_tipo_documento=fo_tipo_documento)
        if fo_categoria_documento:
            queryset = queryset.filter(fo_categoria_documento=fo_categoria_documento)
        if fecha_creacion:
            queryset = queryset.filter(fecha_creacion=fecha_creacion)
        return queryset

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        HistorialAccesoDocumento.objects.create(
            accion='consulta',
            fo_documento=instance,
            fo_usuario=request.user,
        )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def descargar(self, request, pk=None):
        documento = self.get_object()
        HistorialAccesoDocumento.objects.create(
            accion='descarga',
            fo_documento=documento,
            fo_usuario=request.user,
        )
        return FileResponse(documento.archivo.open(), as_attachment=True, filename=os.path.basename(documento.archivo.name))


class HistorialAccesoDocumentoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistorialAccesoDocumento.objects.all()
    serializer_class = HistorialAccesoDocumentoSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('encargado_documental', 'administrador')]
