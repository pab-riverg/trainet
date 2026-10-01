from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from usuarios.permissions import permiso_por_roles

from .models import Contenido
from .serializers import ContenidoSerializer


class ContenidoViewSet(viewsets.ModelViewSet):
    queryset = Contenido.objects.all()
    serializer_class = ContenidoSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre_contenido']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('encargado_formacion', 'recursos_humanos', 'capacitador', 'administrador')]
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
