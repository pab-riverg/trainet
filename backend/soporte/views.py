from datetime import date

from django.db import transaction
from django.db.models import Count, F, Q
from rest_framework import filters, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated

from notificaciones.utils import notificar
from notificaciones.rutas import TICKET_ASIGNADO, TICKET_ESTADO, ruta_de_evento
from usuarios.models import TecnicoSoporte
from usuarios.permissions import permiso_por_roles

from .models import CategoriaTicket, EvidenciaTicket, ModuloSoporteTecnico, TicketSoporte
from .serializers import (
    CategoriaTicketSerializer,
    EvidenciaTicketSerializer,
    ModuloSoporteTecnicoSerializer,
    TicketSoporteSerializer,
)


# Técnicos y administrador gestionan los tickets (ven la pestaña de gestión); el resto, solo los suyos.
ROLES_GESTION_TICKETS = ('tecnico_soporte', 'administrador')


def tickets_visibles(usuario):
    """Administrador: todos. Técnico: asignados a él y sin asignar. Resto: los propios."""
    tickets = TicketSoporte.objects.all()
    if usuario.rol == 'administrador':
        return tickets
    if usuario.rol == 'tecnico_soporte':
        tecnico = TecnicoSoporte.objects.filter(fo_usuario=usuario).first()
        condicion = Q(fo_tecnico__isnull=True)
        if tecnico:
            condicion |= Q(fo_tecnico=tecnico)
        return tickets.filter(condicion)
    return tickets.filter(fo_usuario=usuario)


class ModuloSoporteTecnicoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ModuloSoporteTecnico.objects.all()
    serializer_class = ModuloSoporteTecnicoSerializer
    permission_classes = [IsAuthenticated]


class CategoriaTicketViewSet(viewsets.ModelViewSet):
    queryset = CategoriaTicket.objects.all()
    serializer_class = CategoriaTicketSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('tecnico_soporte', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class TicketSoporteViewSet(viewsets.ModelViewSet):
    queryset = TicketSoporte.objects.all()
    serializer_class = TicketSoporteSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['descripcion', 'fo_usuario__nombre']

    def get_permissions(self):
        if self.action in ['update', 'partial_update']:
            permission_classes = [IsAuthenticated, permiso_por_roles('tecnico_soporte', 'administrador')]
        elif self.action == 'destroy':
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = tickets_visibles(self.request.user)
        params = self.request.query_params
        for campo in ['fo_categoria_ticket', 'estado', 'prioridad', 'fecha_creacion']:
            valor = params.get(campo)
            if valor:
                queryset = queryset.filter(**{campo: valor})
        return queryset.order_by('-id')

    def _tecnico_con_menos_carga(self):
        return (
            TecnicoSoporte.objects
            .annotate(carga=Count('ticketsoporte', filter=Q(ticketsoporte__estado__in=['abierto', 'en_proceso'])))
            .order_by('carga', 'id')
            .first()
        )

    @transaction.atomic
    def perform_create(self, serializer):
        tecnico = self._tecnico_con_menos_carga()
        ticket = serializer.save(fo_usuario=self.request.user, estado='abierto', fo_tecnico=tecnico)
        if tecnico:
            self._notificar_asignacion(ticket)

    @transaction.atomic
    def perform_update(self, serializer):
        previo = serializer.instance
        estado_previo = previo.estado
        tecnico_previo = previo.fo_tecnico

        tecnico_nuevo = serializer.validated_data.get('fo_tecnico', tecnico_previo)
        if tecnico_nuevo != tecnico_previo and self.request.user.rol != 'administrador':
            raise PermissionDenied('Solo un administrador puede reasignar el técnico del ticket.')

        ticket = serializer.save()

        if ticket.fo_tecnico and ticket.fo_tecnico != tecnico_previo:
            self._notificar_asignacion(ticket)

        if ticket.estado != estado_previo:
            etiqueta = ticket.get_estado_display()
            notificar(
                usuario=ticket.fo_usuario,
                mensaje_interno=f'Tu ticket #{ticket.id} cambió a "{etiqueta}".',
                asunto_correo='Actualización de tu ticket de soporte - TRAINET',
                cuerpo_correo=(
                    f'Hola, tu ticket #{ticket.id} cambió a "{etiqueta}". '
                    f'Observaciones: {ticket.observaciones or "sin observaciones"}.'
                ),
                ruta=ruta_de_evento(TICKET_ESTADO, ticket.fo_usuario.rol)
            )

            if ticket.estado in ['resuelto', 'cerrado'] and ticket.fecha_resolucion is None:
                ticket.fecha_resolucion = date.today()
                ticket.tiempo_resolucion = (ticket.fecha_resolucion - ticket.fecha_creacion).days
                ticket.save(update_fields=['fecha_resolucion', 'tiempo_resolucion'])

                if ticket.estado == 'resuelto' and ticket.fo_tecnico:
                    TecnicoSoporte.objects.filter(pk=ticket.fo_tecnico_id).update(
                        tickets_resueltos=F('tickets_resueltos') + 1
                    )

    def _notificar_asignacion(self, ticket):
        notificar(
            usuario=ticket.fo_tecnico.fo_usuario,
            mensaje_interno=f'Se te asignó el ticket #{ticket.id}: {ticket.descripcion}',
            asunto_correo='Ticket de soporte asignado - TRAINET',
            cuerpo_correo=f'Hola, se te ha asignado el ticket #{ticket.id}. Descripción: {ticket.descripcion}. Prioridad: {ticket.prioridad}.',
            ruta=ruta_de_evento(TICKET_ASIGNADO, ticket.fo_tecnico.fo_usuario.rol)
        )


class EvidenciaTicketViewSet(viewsets.ModelViewSet):
    queryset = EvidenciaTicket.objects.all()
    serializer_class = EvidenciaTicketSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_queryset(self):
        queryset = EvidenciaTicket.objects.filter(
            fo_ticket__in=tickets_visibles(self.request.user)
        ).order_by('-id')
        fo_ticket = self.request.query_params.get('fo_ticket')
        if fo_ticket:
            queryset = queryset.filter(fo_ticket=fo_ticket)
        return queryset

    def perform_create(self, serializer):
        ticket = serializer.validated_data['fo_ticket']
        if not tickets_visibles(self.request.user).filter(pk=ticket.pk).exists():
            raise PermissionDenied('No tienes permiso para adjuntar evidencias a este ticket.')
        serializer.save()

    def perform_destroy(self, instance):
        usuario = self.request.user
        es_dueno = instance.fo_ticket.fo_usuario_id == usuario.id
        if not (es_dueno or usuario.rol in ['tecnico_soporte', 'administrador']):
            raise PermissionDenied('No tienes permiso para eliminar esta evidencia.')
        archivo = instance.archivo
        instance.delete()
        if archivo:
            archivo.delete(save=False)
