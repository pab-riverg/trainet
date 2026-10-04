import os

from django.http import FileResponse
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from usuarios.permissions import permiso_por_roles

from .models import (
    CategoriaDocumento,
    Documento,
    HistorialAccesoDocumento,
    ModuloGestionDocumental,
    TipoDocumento,
)
from .serializers import (
    CategoriaDocumentoSerializer,
    DocumentoSerializer,
    HistorialAccesoDocumentoSerializer,
    ModuloGestionDocumentalSerializer,
    TipoDocumentoSerializer,
)


class ModuloGestionDocumentalViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ModuloGestionDocumental.objects.all()
    serializer_class = ModuloGestionDocumentalSerializer
    permission_classes = [IsAuthenticated]


class _CatalogoDocumentalViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('encargado_documental', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class TipoDocumentoViewSet(_CatalogoDocumentalViewSet):
    queryset = TipoDocumento.objects.all()
    serializer_class = TipoDocumentoSerializer


class CategoriaDocumentoViewSet(_CatalogoDocumentalViewSet):
    queryset = CategoriaDocumento.objects.all()
    serializer_class = CategoriaDocumentoSerializer


class DocumentoViewSet(viewsets.ModelViewSet):
    queryset = Documento.objects.all().order_by('-fecha_creacion', '-id')
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

    def _actualizar_contador(self, modulo):
        modulo.documentos_almacenados = Documento.objects.filter(fo_mod_doc=modulo).count()
        modulo.save(update_fields=['documentos_almacenados'])

    def perform_create(self, serializer):
        documento = serializer.save()
        self._actualizar_contador(documento.fo_mod_doc)

    def perform_destroy(self, instance):
        modulo = instance.fo_mod_doc
        instance.delete()
        self._actualizar_contador(modulo)

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
    queryset = HistorialAccesoDocumento.objects.all().order_by('-fecha')
    serializer_class = HistorialAccesoDocumentoSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('encargado_documental', 'administrador')]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_documento = self.request.query_params.get('fo_documento')
        accion = self.request.query_params.get('accion')
        if fo_documento:
            queryset = queryset.filter(fo_documento=fo_documento)
        if accion:
            queryset = queryset.filter(accion=accion)
        return queryset
