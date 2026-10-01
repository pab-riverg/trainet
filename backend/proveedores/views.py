from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated

from usuarios.permissions import permiso_por_roles

from .models import (
    ContratoProveedor,
    CotizacionProveedor,
    NecesidadCapacitacionExterna,
    Proveedor,
    ServicioProveedor,
)
from .serializers import (
    ContratoProveedorSerializer,
    CotizacionProveedorSerializer,
    NecesidadCapacitacionExternaSerializer,
    ProveedorSerializer,
    ServicioProveedorSerializer,
)


class ProveedorViewSet(viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['razon_social']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'recursos_humanos')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        especialidad = self.request.query_params.get('especialidad')
        if especialidad:
            queryset = queryset.filter(especialidad=especialidad)
        return queryset


class ServicioProveedorViewSet(viewsets.ModelViewSet):
    queryset = ServicioProveedor.objects.all()
    serializer_class = ServicioProveedorSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'recursos_humanos')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class ContratoProveedorViewSet(viewsets.ModelViewSet):
    queryset = ContratoProveedor.objects.all()
    serializer_class = ContratoProveedorSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_proveedor = self.request.query_params.get('fo_proveedor')
        estado = self.request.query_params.get('estado')
        if fo_proveedor:
            queryset = queryset.filter(fo_proveedor=fo_proveedor)
        if estado:
            queryset = queryset.filter(estado=estado)
        return queryset


class NecesidadCapacitacionExternaViewSet(viewsets.ModelViewSet):
    queryset = NecesidadCapacitacionExterna.objects.all()
    serializer_class = NecesidadCapacitacionExternaSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('recursos_humanos', 'directivo', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class CotizacionProveedorViewSet(viewsets.ModelViewSet):
    queryset = CotizacionProveedor.objects.all()
    serializer_class = CotizacionProveedorSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'proveedor_contenido')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
