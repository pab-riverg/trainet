from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from notificaciones.utils import notificar
from usuarios.permissions import permiso_por_roles

from .models import CotizacionCompra, ItemOrden, OrdenCompra
from .serializers import (
    CotizacionCompraSerializer,
    ItemOrdenSerializer,
    OrdenCompraCreateSerializer,
    OrdenCompraSerializer,
)


class OrdenCompraViewSet(viewsets.ModelViewSet):
    queryset = OrdenCompra.objects.all()
    serializer_class = OrdenCompraSerializer

    def get_serializer_class(self):
        if self.action == 'create':
            return OrdenCompraCreateSerializer
        return OrdenCompraSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador')]
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

    def perform_update(self, serializer):
        instancia = serializer.save()
        if instancia.estado == 'entregada':
            notificar(
                usuario=instancia.fo_usuario,
                mensaje_interno=f'Tu orden de compra "{instancia.descripcion}" fue entregada',
                asunto_correo='Compra entregada - TRAINET',
                cuerpo_correo=f'Hola, tu solicitud de compra "{instancia.descripcion}" ha sido marcada como entregada.'
            )


class ItemOrdenViewSet(viewsets.ModelViewSet):
    queryset = ItemOrden.objects.all()
    serializer_class = ItemOrdenSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class CotizacionCompraViewSet(viewsets.ModelViewSet):
    queryset = CotizacionCompra.objects.all()
    serializer_class = CotizacionCompraSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
