import os

from django.http import FileResponse
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

from usuarios.permissions import permiso_por_roles

from .models import CategoriaContenido, Contenido, EstadoContenido, ModuloInventarioContenido
from .serializers import (
    CategoriaContenidoSerializer,
    ContenidoSerializer,
    EstadoContenidoSerializer,
    ModuloInventarioContenidoSerializer,
)

ROLES_GESTION_CONTENIDO = ('encargado_formacion', 'recursos_humanos', 'capacitador', 'administrador')


class ModuloInventarioContenidoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ModuloInventarioContenido.objects.all()
    serializer_class = ModuloInventarioContenidoSerializer
    permission_classes = [IsAuthenticated]


class _CatalogoContenidoViewSet(viewsets.ModelViewSet):
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles(*ROLES_GESTION_CONTENIDO)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class CategoriaContenidoViewSet(_CatalogoContenidoViewSet):
    queryset = CategoriaContenido.objects.all()
    serializer_class = CategoriaContenidoSerializer


class EstadoContenidoViewSet(_CatalogoContenidoViewSet):
    queryset = EstadoContenido.objects.all()
    serializer_class = EstadoContenidoSerializer


class ContenidoViewSet(viewsets.ModelViewSet):
    queryset = Contenido.objects.all().order_by('-fecha_actualizacion', '-id')
    serializer_class = ContenidoSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre_contenido']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles(*ROLES_GESTION_CONTENIDO)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_categoria_cont = self.request.query_params.get('fo_categoria_cont')
        fo_estado_cont = self.request.query_params.get('fo_estado_cont')
        fecha_creacion = self.request.query_params.get('fecha_creacion')
        tipo_contenido = self.request.query_params.get('tipo_contenido')
        if fo_categoria_cont:
            queryset = queryset.filter(fo_categoria_cont=fo_categoria_cont)
        if fo_estado_cont:
            queryset = queryset.filter(fo_estado_cont=fo_estado_cont)
        if fecha_creacion:
            queryset = queryset.filter(fecha_creacion=fecha_creacion)
        if tipo_contenido:
            queryset = queryset.filter(tipo_contenido=tipo_contenido)
        return queryset

    def perform_update(self, serializer):
        archivo_anterior = serializer.instance.archivo
        nombre_anterior = archivo_anterior.name
        contenido = serializer.save()
        if 'archivo' in self.request.FILES and nombre_anterior and nombre_anterior != contenido.archivo.name:
            archivo_anterior.delete(save=False)

    def perform_destroy(self, instance):
        archivo = instance.archivo
        instance.delete()
        if archivo:
            archivo.delete(save=False)

    @action(detail=True, methods=['get'])
    def descargar(self, request, pk=None):
        contenido = self.get_object()
        return FileResponse(contenido.archivo.open(), as_attachment=True, filename=os.path.basename(contenido.archivo.name))
