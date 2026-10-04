import os
from datetime import date

from django.db import transaction
from django.db.models import ProtectedError
from django.http import FileResponse
from django.utils import timezone
from rest_framework import filters, mixins, serializers as drf_serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notificaciones.utils import notificar
from notificaciones.rutas import COMPRA_COMPRADA, COMPRA_DECISION, COMPRA_ENTREGADA, COMPRA_NUEVA, COMPRA_OBSERVACION, COMPRA_RECIBIDA, COMPRA_RECLAMO, ORDEN_COMPRA_ENTREGADA, ruta_de_evento
from proveedores.models import Proveedor
from usuarios.models import Usuario
from usuarios.permissions import permiso_por_roles

from .models import (
    Articulo,
    CategoriaArticulo,
    CotizacionCompra,
    EventoSolicitud,
    FacturaCompra,
    ItemOrden,
    ItemSolicitud,
    ModuloComprasInternas,
    OrdenCompra,
    SolicitudCompra,
)
from .permisos import (
    ROLES_APROBACION_COMPRAS,
    ROLES_GESTION_COMPRAS,
    ROLES_PRESUPUESTO_COMPRAS,
    ROLES_SOLICITUD_COMPRAS,
    ROLES_VER_TODAS_SOLICITUDES,
    ROLES_VISTA_COMPRAS,
)
from .serializers import (
    ArticuloSerializer,
    CategoriaArticuloSerializer,
    ConfirmarCompraSerializer,
    CotizacionCompraSerializer,
    DecisionCompraSerializer,
    EntregaSerializer,
    FacturaCompraSerializer,
    ItemOrdenSerializer,
    ObservacionSerializer,
    OrdenCompraCreateSerializer,
    OrdenCompraSerializer,
    ReclamoSerializer,
    SolicitudCompraCrearSerializer,
    SolicitudCompraDetalleSerializer,
    SolicitudCompraSerializer,
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
                cuerpo_correo=f'Hola, tu solicitud de compra "{instancia.descripcion}" ha sido marcada como entregada.',
                ruta=ruta_de_evento(ORDEN_COMPRA_ENTREGADA, instancia.fo_usuario.rol)
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


# --- Catálogo de artículos y solicitudes de compra (carrito) ---

METODOS_HTTP_CATALOGO = ['get', 'post', 'patch', 'delete', 'head', 'options']


def permisos_por_roles(*roles):
    return [IsAuthenticated(), permiso_por_roles(*roles)()]


class PermisosCatalogoMixin:
    """Lectura para todos los roles del módulo; escritura solo para gestión."""

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return permisos_por_roles(*ROLES_GESTION_COMPRAS)
        return permisos_por_roles(*ROLES_VISTA_COMPRAS)


class ModuloComprasInternasSerializer(drf_serializers.ModelSerializer):
    presupuesto_disponible = drf_serializers.IntegerField(
        min_value=0,
        error_messages={'min_value': 'El presupuesto no puede ser negativo.'}
    )

    class Meta:
        model = ModuloComprasInternas
        fields = '__all__'
        read_only_fields = ['fo_sistema']


class ModuloComprasInternasViewSet(mixins.UpdateModelMixin, viewsets.ReadOnlyModelViewSet):
    """Lectura para todos los roles del módulo; solo el administrador ajusta el presupuesto (PATCH)."""

    queryset = ModuloComprasInternas.objects.all()
    serializer_class = ModuloComprasInternasSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_permissions(self):
        if self.action == 'partial_update':
            return permisos_por_roles(*ROLES_PRESUPUESTO_COMPRAS)
        return permisos_por_roles(*ROLES_VISTA_COMPRAS)


class CategoriaArticuloViewSet(PermisosCatalogoMixin, viewsets.ModelViewSet):
    queryset = CategoriaArticulo.objects.all()
    serializer_class = CategoriaArticuloSerializer
    http_method_names = METODOS_HTTP_CATALOGO

    def get_queryset(self):
        return CategoriaArticulo.objects.prefetch_related('proveedores').order_by('nombre')

    def perform_destroy(self, instance):
        if instance.articulo_set.exists():
            raise ValidationError(
                'No se puede eliminar la categoría porque tiene artículos. Mueve o elimina sus artículos primero.'
            )
        instance.delete()


class ArticuloViewSet(PermisosCatalogoMixin, viewsets.ModelViewSet):
    queryset = Articulo.objects.all()
    serializer_class = ArticuloSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'descripcion']
    http_method_names = METODOS_HTTP_CATALOGO

    def get_queryset(self):
        queryset = articulos_visibles(self.request.user).select_related('fo_categoria').order_by('fo_categoria__nombre', 'nombre')
        params = self.request.query_params
        if params.get('categoria'):
            queryset = queryset.filter(fo_categoria=params['categoria'])
        if params.get('disponible') is not None:
            queryset = queryset.filter(disponible=params['disponible'].lower() == 'true')
        return queryset

    @transaction.atomic
    def perform_update(self, serializer):
        imagen_anterior = serializer.instance.imagen
        nombre_anterior = imagen_anterior.name if imagen_anterior else None
        articulo = serializer.save()
        if 'imagen' in self.request.FILES and nombre_anterior and nombre_anterior != articulo.imagen.name:
            imagen_anterior.delete(save=False)

    def perform_destroy(self, instance):
        if ItemSolicitud.objects.filter(fo_articulo=instance).exists():
            raise ValidationError(
                'No se puede eliminar el artículo porque tiene solicitudes asociadas. '
                'Márcalo como no disponible para archivarlo.'
            )
        imagen = instance.imagen
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError('No se puede eliminar el artículo porque tiene registros asociados.')
        if imagen:
            imagen.delete(save=False)


def registrar_evento(solicitud, tipo, usuario, detalle=''):
    EventoSolicitud.objects.create(fo_solicitud=solicitud, tipo=tipo, fo_usuario=usuario, detalle=detalle)


def usuarios_activos(*roles):
    return Usuario.objects.filter(rol__in=roles, is_active=True)


def avisar(usuarios, mensaje, asunto, evento):
    """Aviso interno (máx. 255 caracteres) y correo con el texto completo; `evento` define a dónde lleva."""
    for usuario in usuarios:
        notificar(
            usuario=usuario,
            mensaje_interno=mensaje[:255],
            asunto_correo=asunto,
            cuerpo_correo=f'Hola, {mensaje}',
            ruta=ruta_de_evento(evento, usuario.rol)
        )


def exigir_estado(solicitud, estados, accion):
    if solicitud.estado not in estados:
        permitidos = ' o '.join(estados)
        raise ValidationError(
            f'No se puede {accion}: la solicitud está "{solicitud.estado}" y debe estar en {permitidos}.'
        )


def solicitudes_visibles(usuario):
    """Quien ve todas las solicitudes (ROLES_VER_TODAS_SOLICITUDES) las ve todas; el resto, solo las suyas."""
    solicitudes = SolicitudCompra.objects.all()
    if usuario.rol not in ROLES_VER_TODAS_SOLICITUDES:
        solicitudes = solicitudes.filter(fo_solicitante=usuario)
    return solicitudes


def articulos_visibles(usuario):
    """Quien solicita compras solo ve los artículos disponibles; el resto, todo el catálogo."""
    articulos = Articulo.objects.all()
    if usuario.rol in ROLES_SOLICITUD_COMPRAS:
        articulos = articulos.filter(disponible=True)
    return articulos


class SolicitudCompraViewSet(viewsets.ModelViewSet):
    queryset = SolicitudCompra.objects.all()
    serializer_class = SolicitudCompraSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['area', 'nota', 'fo_solicitante__nombre', 'items__fo_articulo__nombre']
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_serializer_class(self):
        # La lista omite la bitácora para no encarecerla; el resto de respuestas llevan el detalle.
        if self.action == 'list':
            return SolicitudCompraSerializer
        return SolicitudCompraDetalleSerializer

    def get_permissions(self):
        if self.action == 'create':
            return permisos_por_roles(*ROLES_SOLICITUD_COMPRAS)
        if self.action in ('decidir', 'confirmar_compra'):
            return permisos_por_roles(*ROLES_APROBACION_COMPRAS)
        if self.action == 'entregar':
            return permisos_por_roles(*ROLES_GESTION_COMPRAS)
        if self.action == 'proveedores_sugeridos':
            return permisos_por_roles(*ROLES_VER_TODAS_SOLICITUDES)
        return permisos_por_roles(*ROLES_VISTA_COMPRAS)

    def get_queryset(self):
        queryset = (
            solicitudes_visibles(self.request.user)
            .select_related('fo_solicitante', 'fo_aprobador', 'fo_comprador', 'fo_entregado_por')
            .prefetch_related('items__fo_articulo__fo_categoria', 'historial__fo_usuario')
        )
        estado = self.request.query_params.get('estado')
        if estado:
            queryset = queryset.filter(estado=estado)
        return queryset.order_by('-id')

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        entrada = SolicitudCompraCrearSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data

        modulo = ModuloComprasInternas.objects.first()
        if modulo is None:
            raise ValidationError('El módulo de compras internas no está configurado.')

        # Estado, solicitante, precios y total los fija el servidor; se ignora lo que envíe el cliente.
        solicitud = SolicitudCompra.objects.create(
            area=datos['area'].strip(),
            nota=datos['nota'].strip(),
            estado='pendiente',
            fo_solicitante=request.user,
            fo_mod_compras=modulo,
        )
        items = [
            ItemSolicitud(
                fo_solicitud=solicitud,
                fo_articulo=item['fo_articulo'],
                cantidad=item['cantidad'],
                precio_unitario=item['fo_articulo'].precio_referencia,
                justificacion=item['justificacion'].strip(),
            )
            for item in datos['items']
        ]
        ItemSolicitud.objects.bulk_create(items)
        solicitud.total_estimado = sum(item.cantidad * item.precio_unitario for item in items)
        solicitud.save(update_fields=['total_estimado'])
        registrar_evento(solicitud, 'creada', request.user)

        destinatarios = Usuario.objects.filter(rol__in=ROLES_VER_TODAS_SOLICITUDES, is_active=True).exclude(pk=request.user.pk)
        for usuario in destinatarios:
            notificar(
                usuario=usuario,
                mensaje_interno=f'Nueva solicitud de compra #{solicitud.id} de {request.user.nombre} ({solicitud.area})',
                asunto_correo='Nueva solicitud de compra - TRAINET',
                cuerpo_correo=(
                    f'Hola, {request.user.nombre} registró la solicitud de compra #{solicitud.id} para el área '
                    f'{solicitud.area} por un total estimado de {solicitud.total_estimado}.'
                ),
                ruta=ruta_de_evento(COMPRA_NUEVA, usuario.rol)
            )

        solicitud = self.get_queryset().get(pk=solicitud.pk)
        return Response(self.get_serializer(solicitud).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        if instance.fo_solicitante_id != self.request.user.id:
            raise PermissionDenied('Solo el solicitante puede cancelar su solicitud.')
        if instance.estado != 'pendiente':
            raise ValidationError('Solo se pueden cancelar solicitudes que sigan pendientes.')
        instance.delete()

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def decidir(self, request, pk=None):
        solicitud = self.get_object()
        if solicitud.estado != 'pendiente':
            raise ValidationError('Solo se pueden decidir solicitudes pendientes.')

        entrada = DecisionCompraSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data

        solicitud.estado = datos['estado']
        solicitud.motivo_decision = datos['motivo']
        solicitud.fo_aprobador = request.user
        solicitud.fecha_decision = timezone.now()
        solicitud.save(update_fields=['estado', 'motivo_decision', 'fo_aprobador', 'fecha_decision'])
        registrar_evento(solicitud, solicitud.estado, request.user, solicitud.motivo_decision)

        resultado = 'aprobada' if solicitud.estado == 'aprobada' else 'rechazada'
        mensaje = f'Tu solicitud de compra #{solicitud.id} fue {resultado}. Motivo: {solicitud.motivo_decision}'
        notificar(
            usuario=solicitud.fo_solicitante,
            mensaje_interno=mensaje[:255],
            asunto_correo='Decisión sobre tu solicitud de compra - TRAINET',
            cuerpo_correo=f'Hola, {mensaje}',
            ruta=ruta_de_evento(COMPRA_DECISION, solicitud.fo_solicitante.rol)
        )
        return self._responder(solicitud)

    def _responder(self, solicitud):
        # Se vuelve a leer para que la bitácora incluya el evento recién registrado.
        solicitud = SolicitudCompra.objects.get(pk=solicitud.pk)
        return Response(self.get_serializer(solicitud).data)

    def _solicitante_o_403(self, solicitud):
        if solicitud.fo_solicitante_id != self.request.user.id or self.request.user.rol not in ROLES_SOLICITUD_COMPRAS:
            raise PermissionDenied('Solo el solicitante puede realizar esta acción.')

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def observar(self, request, pk=None):
        # El rol se valida después de get_object para que quien no ve la solicitud reciba 404, no 403.
        solicitud = self.get_object()
        if request.user.rol not in ROLES_GESTION_COMPRAS:
            raise PermissionDenied('Solo administración puede dejar observaciones.')
        exigir_estado(solicitud, ['pendiente'], 'dejar una observación')

        entrada = ObservacionSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        texto = entrada.validated_data['observacion']

        registrar_evento(solicitud, 'observacion', request.user, texto)

        decisores = usuarios_activos(*ROLES_APROBACION_COMPRAS).exclude(pk=request.user.pk)
        avisar(
            decisores,
            f'{request.user.nombre} dejó una observación en la solicitud de compra #{solicitud.id}: {texto}',
            'Observación en una solicitud de compra - TRAINET',
            COMPRA_OBSERVACION
        )
        return self._responder(solicitud)

    @action(detail=True, methods=['post'], url_path='confirmar-compra')
    @transaction.atomic
    def confirmar_compra(self, request, pk=None):
        solicitud = self.get_object()

        entrada = ConfirmarCompraSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data

        # Se bloquean el módulo (presupuesto) y la solicitud para evitar compras dobles o gastos simultáneos.
        modulo = ModuloComprasInternas.objects.select_for_update().get(pk=solicitud.fo_mod_compras_id)
        solicitud = SolicitudCompra.objects.select_for_update().get(pk=solicitud.pk)
        exigir_estado(solicitud, ['aprobada'], 'confirmar la compra')

        cotizacion = CotizacionCompra.objects.filter(pk=datos['cotizacion'], fo_solicitud=solicitud).first()
        if cotizacion is None:
            raise ValidationError('La cotización no pertenece a esta solicitud.')
        if cotizacion.monto_total > modulo.presupuesto_disponible:
            raise ValidationError(
                f'El monto de la cotización ({cotizacion.monto_total}) supera el presupuesto disponible '
                f'({modulo.presupuesto_disponible}).'
            )

        modulo.presupuesto_disponible -= cotizacion.monto_total
        modulo.save(update_fields=['presupuesto_disponible'])

        comentario = datos['comentario'].strip()
        orden = OrdenCompra.objects.create(
            fecha_orden=date.today(),
            iva=cotizacion.iva,
            total=cotizacion.monto_total,
            estado='compra_confirmada',
            descripcion=f'Solicitud de compra #{solicitud.id}',
            motivo=(solicitud.nota or 'Solicitud de compra interna')[:255],
            area=solicitud.area,
            comentario_decision=comentario[:255],
            fo_proveedor=cotizacion.fo_proveedor,
            fo_mod_compras=modulo,
            fo_usuario=solicitud.fo_solicitante,
        )
        ItemOrden.objects.bulk_create([
            ItemOrden(
                descripcion_item=item.fo_articulo.nombre[:255],
                cantidad=item.cantidad,
                subtotal=item.cantidad * item.precio_unitario,
                fo_orden=orden,
            )
            for item in solicitud.items.select_related('fo_articulo')
        ])

        solicitud.estado = 'comprada'
        solicitud.fecha_compra = timezone.now()
        solicitud.fo_comprador = request.user
        solicitud.fo_cotizacion_elegida = cotizacion
        solicitud.fo_orden = orden
        solicitud.save(update_fields=['estado', 'fecha_compra', 'fo_comprador', 'fo_cotizacion_elegida', 'fo_orden'])

        detalle = f'Proveedor: {cotizacion.fo_proveedor.razon_social}. Monto: {cotizacion.monto_total}.'
        if comentario:
            detalle += f' Comentario: {comentario}'
        registrar_evento(solicitud, 'comprada', request.user, detalle)

        mensaje = (
            f'La solicitud de compra #{solicitud.id} fue comprada a {cotizacion.fo_proveedor.razon_social} '
            f'por {cotizacion.monto_total}.'
        )
        destinatarios = {u.pk: u for u in usuarios_activos('encargado_administrativo')}
        destinatarios[solicitud.fo_solicitante_id] = solicitud.fo_solicitante
        avisar(destinatarios.values(), mensaje, 'Compra confirmada - TRAINET', COMPRA_COMPRADA)
        return self._responder(solicitud)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def entregar(self, request, pk=None):
        solicitud = self.get_object()
        exigir_estado(solicitud, ['comprada', 'en_revision'], 'entregar')

        entrada = EntregaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        nota = entrada.validated_data['nota'].strip()

        reentrega = solicitud.estado == 'en_revision'
        if reentrega and not nota:
            raise ValidationError('La nota es obligatoria: explica cómo se resolvió el reclamo.')

        solicitud.estado = 'entregada'
        solicitud.fecha_entrega = timezone.now()
        solicitud.fo_entregado_por = request.user
        solicitud.save(update_fields=['estado', 'fecha_entrega', 'fo_entregado_por'])
        registrar_evento(solicitud, 'reentregada' if reentrega else 'entregada', request.user, nota)

        mensaje = f'Tu solicitud de compra #{solicitud.id} fue entregada. Confirma que la recibiste.'
        if reentrega:
            mensaje = f'Tu reclamo sobre la solicitud #{solicitud.id} fue atendido: {nota} Confirma si ya la recibiste.'
        avisar([solicitud.fo_solicitante], mensaje, 'Entrega de tu solicitud de compra - TRAINET', COMPRA_ENTREGADA)
        return self._responder(solicitud)

    @action(detail=True, methods=['post'], url_path='confirmar-recepcion')
    @transaction.atomic
    def confirmar_recepcion(self, request, pk=None):
        solicitud = self.get_object()
        self._solicitante_o_403(solicitud)
        exigir_estado(solicitud, ['entregada'], 'confirmar la recepción')

        solicitud.estado = 'recibida'
        solicitud.fecha_confirmacion = timezone.now()
        solicitud.save(update_fields=['estado', 'fecha_confirmacion'])
        registrar_evento(solicitud, 'recibida', request.user)

        avisar(
            usuarios_activos('encargado_administrativo'),
            f'{request.user.nombre} confirmó la recepción de la solicitud de compra #{solicitud.id}.',
            'Recepción confirmada - TRAINET',
            COMPRA_RECIBIDA
        )
        return self._responder(solicitud)

    @action(detail=True, methods=['post'], url_path='reportar-no-recibida')
    @transaction.atomic
    def reportar_no_recibida(self, request, pk=None):
        solicitud = self.get_object()
        self._solicitante_o_403(solicitud)
        exigir_estado(solicitud, ['entregada'], 'reportar que no se recibió')

        entrada = ReclamoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        motivo = entrada.validated_data['motivo'].strip()

        solicitud.estado = 'en_revision'
        solicitud.motivo_reclamo = motivo
        solicitud.fecha_reclamo = timezone.now()
        solicitud.save(update_fields=['estado', 'motivo_reclamo', 'fecha_reclamo'])
        registrar_evento(solicitud, 'no_recibida', request.user, motivo)

        mensaje = f'{request.user.nombre} reporta que NO recibió la solicitud de compra #{solicitud.id}.'
        if motivo:
            mensaje += f' Motivo: {motivo}'
        avisar(usuarios_activos('encargado_administrativo', 'administrador'), mensaje, 'Reclamo de compra - TRAINET', COMPRA_RECLAMO)
        return self._responder(solicitud)

    @action(detail=True, methods=['get'], url_path='proveedores-sugeridos')
    def proveedores_sugeridos(self, request, pk=None):
        solicitud = self.get_object()
        categorias = CategoriaArticulo.objects.filter(articulo__itemsolicitud__fo_solicitud=solicitud)
        proveedores = (
            Proveedor.objects.filter(categorias_articulo__in=categorias)
            .exclude(estado='inactivo')
            .distinct()
            .order_by('razon_social')
        )
        return Response([
            {'id': proveedor.id, 'razon_social': proveedor.razon_social, 'especialidad': proveedor.especialidad}
            for proveedor in proveedores
        ])


def respuesta_archivo(campo_archivo):
    return FileResponse(campo_archivo.open(), as_attachment=True, filename=os.path.basename(campo_archivo.name))


class CotizacionCompraViewSet(viewsets.ModelViewSet):
    """Cotizaciones de una solicitud aprobada. Son internas de administración: el solicitante no las ve."""

    queryset = CotizacionCompra.objects.all()
    serializer_class = CotizacionCompraSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return permisos_por_roles(*ROLES_GESTION_COMPRAS)
        return permisos_por_roles(*ROLES_VER_TODAS_SOLICITUDES)

    def get_queryset(self):
        queryset = CotizacionCompra.objects.select_related('fo_proveedor', 'fo_usuario').order_by('-id')
        fo_solicitud = self.request.query_params.get('fo_solicitud')
        if fo_solicitud:
            queryset = queryset.filter(fo_solicitud=fo_solicitud)
        return queryset

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cotizacion = serializer.save(fo_usuario=request.user)

        # La sugerencia de proveedores es orientativa: se permite cualquiera, pero se avisa.
        categorias = CategoriaArticulo.objects.filter(articulo__itemsolicitud__fo_solicitud=cotizacion.fo_solicitud)
        es_sugerido = Proveedor.objects.filter(pk=cotizacion.fo_proveedor_id, categorias_articulo__in=categorias).exists()
        datos = dict(self.get_serializer(cotizacion).data)
        datos['advertencia'] = None if es_sugerido else (
            'Este proveedor no está entre los sugeridos para las categorías de la solicitud.'
        )
        return Response(datos, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        solicitud = instance.fo_solicitud
        if solicitud is None:
            raise ValidationError('Esta cotización pertenece al flujo anterior de órdenes y no se puede eliminar aquí.')
        if solicitud.estado != 'aprobada' or solicitud.fo_cotizacion_elegida_id == instance.id:
            raise ValidationError('Solo se pueden eliminar cotizaciones de solicitudes aprobadas que no fueron elegidas.')
        archivo = instance.archivo
        instance.delete()
        if archivo:
            archivo.delete(save=False)

    @action(detail=True, methods=['get'])
    def descargar(self, request, pk=None):
        return respuesta_archivo(self.get_object().archivo)


class FacturaCompraViewSet(viewsets.ModelViewSet):
    """Facturas de una compra. El solicitante ve las de sus propias solicitudes."""

    queryset = FacturaCompra.objects.all()
    serializer_class = FacturaCompraSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.action in ('create', 'destroy'):
            return permisos_por_roles(*ROLES_GESTION_COMPRAS)
        return permisos_por_roles(*ROLES_VISTA_COMPRAS)

    def get_queryset(self):
        queryset = FacturaCompra.objects.select_related('fo_usuario', 'fo_solicitud').order_by('-id')
        if self.request.user.rol not in ROLES_VER_TODAS_SOLICITUDES:
            queryset = queryset.filter(fo_solicitud__fo_solicitante=self.request.user)
        fo_solicitud = self.request.query_params.get('fo_solicitud')
        if fo_solicitud:
            queryset = queryset.filter(fo_solicitud=fo_solicitud)
        return queryset

    def perform_create(self, serializer):
        serializer.save(fo_usuario=self.request.user)

    def perform_destroy(self, instance):
        if instance.fo_solicitud.estado == 'recibida':
            raise ValidationError('No se pueden eliminar facturas de una solicitud ya recibida.')
        archivo = instance.archivo
        instance.delete()
        if archivo:
            archivo.delete(save=False)

    @action(detail=True, methods=['get'])
    def descargar(self, request, pk=None):
        return respuesta_archivo(self.get_object().archivo)
