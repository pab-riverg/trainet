from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from notificaciones.utils import notificar
from usuarios.permissions import permiso_por_roles

from .models import EvidenciaTicket, TicketSoporte
from .serializers import EvidenciaTicketSerializer, TicketSoporteSerializer


class TicketSoporteViewSet(viewsets.ModelViewSet):
    queryset = TicketSoporte.objects.all()
    serializer_class = TicketSoporteSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('tecnico_soporte', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_usuario = self.request.query_params.get('fo_usuario')
        fo_categoria_ticket = self.request.query_params.get('fo_categoria_ticket')
        if fo_usuario:
            queryset = queryset.filter(fo_usuario=fo_usuario)
        if fo_categoria_ticket:
            queryset = queryset.filter(fo_categoria_ticket=fo_categoria_ticket)
        return queryset

    def perform_update(self, serializer):
        instancia = serializer.save()
        if instancia.fo_tecnico:
            notificar(
                usuario=instancia.fo_tecnico.fo_usuario,
                mensaje_interno=f'Se te asignó el ticket #{instancia.id}: {instancia.descripcion}',
                asunto_correo='Ticket de soporte asignado - TRAINET',
                cuerpo_correo=f'Hola, se te ha asignado el ticket #{instancia.id}. Descripción: {instancia.descripcion}. Prioridad: {instancia.prioridad}.'
            )


class EvidenciaTicketViewSet(viewsets.ModelViewSet):
    queryset = EvidenciaTicket.objects.all()
    serializer_class = EvidenciaTicketSerializer
    permission_classes = [IsAuthenticated]
