from django.db import transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notificaciones.utils import notificar
from notificaciones.rutas import RECURSO_DECISION, RECURSO_DISPONIBILIDAD, RECURSO_ENTREGADO, RECURSO_NUEVO, ruta_de_evento
from usuarios.models import Usuario
from usuarios.permissions import permiso_por_roles

from .models import ModuloPedidoRecursos, SolicitudRecursos, TipoRecurso
from .serializers import (
    DecisionSolicitudSerializer,
    EntregaSolicitudSerializer,
    ModuloPedidoRecursosSerializer,
    SolicitudRecursosCreateSerializer,
    SolicitudRecursosSerializer,
    TipoRecursoSerializer,
)

ROLES_GESTION_RECURSOS = ('encargado_formacion', 'administrador')


def solicitudes_visibles(usuario):
    """Los roles de gestión ven todas las solicitudes; el resto solo las suyas."""
    solicitudes = SolicitudRecursos.objects.all()
    if usuario.rol in ROLES_GESTION_RECURSOS:
        return solicitudes
    return solicitudes.filter(fo_usuario=usuario)


class ModuloPedidoRecursosViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ModuloPedidoRecursos.objects.all()
    serializer_class = ModuloPedidoRecursosSerializer
    permission_classes = [IsAuthenticated]


class TipoRecursoViewSet(viewsets.ModelViewSet):
    queryset = TipoRecurso.objects.all()
    serializer_class = TipoRecursoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles(*ROLES_GESTION_RECURSOS)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class SolicitudRecursosViewSet(viewsets.ModelViewSet):
    queryset = SolicitudRecursos.objects.all()
    serializer_class = SolicitudRecursosSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['justificacion', 'fo_usuario__nombre', 'fo_tipo_recurso__nombre_tipo']
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return SolicitudRecursosCreateSerializer
        return SolicitudRecursosSerializer

    def get_permissions(self):
        if self.action in ['confirmar_disponibilidad', 'decidir', 'entregar']:
            permission_classes = [IsAuthenticated, permiso_por_roles(*ROLES_GESTION_RECURSOS)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = solicitudes_visibles(self.request.user)
        params = self.request.query_params
        for campo in ['estado', 'prioridad', 'fo_tipo_recurso']:
            valor = params.get(campo)
            if valor:
                queryset = queryset.filter(**{campo: valor})
        return queryset.order_by('-id')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        completa = SolicitudRecursosSerializer(serializer.instance, context=self.get_serializer_context())
        return Response(completa.data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def perform_create(self, serializer):
        solicitud = serializer.save(fo_usuario=self.request.user, estado='pendiente')
        for encargado in Usuario.objects.filter(rol='encargado_formacion'):
            notificar(
                usuario=encargado,
                mensaje_interno=f'Nueva solicitud de recursos #{solicitud.id} de {self.request.user.nombre}',
                asunto_correo='Nueva solicitud de recursos - TRAINET',
                cuerpo_correo=(
                    f'Hola, {self.request.user.nombre} registró la solicitud #{solicitud.id}: '
                    f'{solicitud.cantidad} x {solicitud.fo_tipo_recurso.nombre_tipo}. '
                    f'Justificación: {solicitud.justificacion}.'
                ),
                ruta=ruta_de_evento(RECURSO_NUEVO, encargado.rol)
            )

    def perform_destroy(self, instance):
        usuario = self.request.user
        if usuario.rol not in ROLES_GESTION_RECURSOS and instance.estado != 'pendiente':
            raise PermissionDenied('Solo puedes cancelar solicitudes que sigan pendientes.')
        archivo = instance.archivo_entrega
        instance.delete()
        if archivo:
            archivo.delete(save=False)

    def _responder(self, solicitud):
        return Response(SolicitudRecursosSerializer(solicitud, context=self.get_serializer_context()).data)

    @action(detail=True, methods=['post'], url_path='confirmar-disponibilidad')
    def confirmar_disponibilidad(self, request, pk=None):
        solicitud = self.get_object()
        tipo = solicitud.fo_tipo_recurso
        if tipo.disponible:
            mensaje = f'El recurso "{tipo.nombre_tipo}" de tu solicitud #{solicitud.id} está disponible.'
        else:
            mensaje = f'El recurso "{tipo.nombre_tipo}" de tu solicitud #{solicitud.id} no está disponible por ahora.'
        notificar(
            usuario=solicitud.fo_usuario,
            mensaje_interno=mensaje,
            asunto_correo='Disponibilidad de tu solicitud de recursos - TRAINET',
            cuerpo_correo=f'Hola, {mensaje}',
            ruta=ruta_de_evento(RECURSO_DISPONIBILIDAD, solicitud.fo_usuario.rol)
        )
        return self._responder(solicitud)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def decidir(self, request, pk=None):
        solicitud = self.get_object()
        if solicitud.estado != 'pendiente':
            raise ValidationError('Solo se pueden decidir solicitudes pendientes.')

        entrada = DecisionSolicitudSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data

        solicitud.estado = datos['estado']
        solicitud.comentario_encargado = datos['comentario_encargado']
        campos = ['estado', 'comentario_encargado']
        if 'presupuesto_estimado' in datos:
            solicitud.presupuesto_estimado = datos['presupuesto_estimado']
            campos.append('presupuesto_estimado')
        solicitud.save(update_fields=campos)

        resultado = 'aprobada' if solicitud.estado == 'aprobado' else 'rechazada'
        comentario = f' Comentario: {solicitud.comentario_encargado}' if solicitud.comentario_encargado else ''
        mensaje = f'Tu solicitud de recursos #{solicitud.id} fue {resultado}.{comentario}'
        notificar(
            usuario=solicitud.fo_usuario,
            mensaje_interno=mensaje[:255],
            asunto_correo='Respuesta a tu solicitud de recursos - TRAINET',
            cuerpo_correo=f'Hola, {mensaje}',
            ruta=ruta_de_evento(RECURSO_DECISION, solicitud.fo_usuario.rol)
        )
        return self._responder(solicitud)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def entregar(self, request, pk=None):
        solicitud = self.get_object()
        if solicitud.estado != 'aprobado':
            raise ValidationError('Solo se pueden entregar solicitudes aprobadas.')

        entrada = EntregaSolicitudSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)

        solicitud.archivo_entrega = entrada.validated_data['archivo']
        solicitud.estado = 'entregado'
        solicitud.save(update_fields=['archivo_entrega', 'estado'])

        mensaje = f'Tu solicitud de recursos #{solicitud.id} fue entregada. Ya puedes descargar el archivo.'
        notificar(
            usuario=solicitud.fo_usuario,
            mensaje_interno=mensaje,
            asunto_correo='Entrega de tu solicitud de recursos - TRAINET',
            cuerpo_correo=f'Hola, {mensaje}',
            ruta=ruta_de_evento(RECURSO_ENTREGADO, solicitud.fo_usuario.rol)
        )
        return self._responder(solicitud)
