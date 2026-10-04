import os

from django.db import transaction
from django.db.models import ProtectedError
from django.http import FileResponse
from django.utils import timezone
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from notificaciones.utils import notificar
from notificaciones.rutas import ACUERDO_DECISION, ACUERDO_PENDIENTE, COTIZACION_APROBADA, NECESIDAD_NUEVA, ruta_de_evento
from usuarios.models import Usuario

from .models import (
    ContratoProveedor,
    CotizacionProveedor,
    EvaluacionProveedor,
    ModuloGestionProveedores,
    NecesidadCapacitacionExterna,
    Proveedor,
    ServicioProveedor,
)
from .permisos import ROLES_APROBACION_ACUERDOS, PermisosProveedoresMixin
from .serializers import (
    ContratoProveedorSerializer,
    CotizacionProveedorSerializer,
    DecisionAcuerdoSerializer,
    ModuloGestionProveedoresSerializer,
    NecesidadCapacitacionExternaSerializer,
    ProveedorSerializer,
    ServicioProveedorSerializer,
)

# Sin PUT: las modificaciones parciales van por PATCH.
METODOS_HTTP = ['get', 'post', 'patch', 'delete', 'head', 'options']

# Modelos relacionados que se borran junto con el proveedor sin perder información valiosa.
RELACIONES_QUE_SE_ELIMINAN = (CotizacionProveedor, ServicioProveedor, EvaluacionProveedor)


def sincronizar_estado_proveedor(proveedor):
    """Un proveedor con acuerdo vigente queda 'contratado'; sin acuerdos vigentes vuelve a 'sin_contratar'."""
    if proveedor.estado == 'inactivo':
        return
    vigente = ContratoProveedor.objects.filter(fo_proveedor=proveedor, estado='vigente').exists()
    nuevo_estado = 'contratado' if vigente else 'sin_contratar'
    if proveedor.estado != nuevo_estado:
        proveedor.estado = nuevo_estado
        proveedor.save(update_fields=['estado'])


def respuesta_archivo(campo_archivo):
    return FileResponse(campo_archivo.open(), as_attachment=True, filename=os.path.basename(campo_archivo.name))


class ModuloGestionProveedoresViewSet(PermisosProveedoresMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ModuloGestionProveedores.objects.all()
    serializer_class = ModuloGestionProveedoresSerializer


class ProveedorViewSet(PermisosProveedoresMixin, viewsets.ModelViewSet):
    queryset = Proveedor.objects.all()
    serializer_class = ProveedorSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['razon_social', 'rut', 'contacto']
    http_method_names = METODOS_HTTP

    def get_queryset(self):
        queryset = Proveedor.objects.all().order_by('razon_social', 'id')
        estado = self.request.query_params.get('estado')
        especialidad = self.request.query_params.get('especialidad')
        if estado:
            queryset = queryset.filter(estado=estado)
        if especialidad:
            queryset = queryset.filter(especialidad__icontains=especialidad)
        return queryset

    def perform_destroy(self, instance):
        if ContratoProveedor.objects.filter(fo_proveedor=instance).exists():
            raise ValidationError('No se puede eliminar el proveedor porque tiene contratos registrados. '
                                  'Puedes marcarlo como inactivo.')

        for relacion in Proveedor._meta.related_objects:
            modelo = relacion.related_model
            if modelo in RELACIONES_QUE_SE_ELIMINAN:
                continue
            if modelo.objects.filter(**{relacion.field.name: instance}).exists():
                raise ValidationError(
                    f'No se puede eliminar el proveedor porque tiene registros asociados ({modelo._meta.verbose_name}). '
                    'Puedes marcarlo como inactivo.'
                )

        archivos = [cotizacion.archivo for cotizacion in instance.cotizacionproveedor_set.all()]
        instance.delete()
        for archivo in archivos:
            if archivo:
                archivo.delete(save=False)

    @action(detail=True, methods=['get'])
    def historial(self, request, pk=None):
        proveedor = self.get_object()
        contratos = ContratoProveedor.objects.filter(fo_proveedor=proveedor).order_by('-fecha_inicio', '-id')
        serializer = ContratoProveedorSerializer(contratos, many=True, context=self.get_serializer_context())
        return Response(serializer.data)


class ServicioProveedorViewSet(PermisosProveedoresMixin, viewsets.ModelViewSet):
    queryset = ServicioProveedor.objects.all()
    serializer_class = ServicioProveedorSerializer
    http_method_names = METODOS_HTTP

    def get_queryset(self):
        queryset = ServicioProveedor.objects.all().order_by('id')
        fo_proveedor = self.request.query_params.get('fo_proveedor')
        if fo_proveedor:
            queryset = queryset.filter(fo_proveedor=fo_proveedor)
        return queryset


class NecesidadCapacitacionExternaViewSet(PermisosProveedoresMixin, viewsets.ModelViewSet):
    queryset = NecesidadCapacitacionExterna.objects.all()
    serializer_class = NecesidadCapacitacionExternaSerializer
    http_method_names = METODOS_HTTP

    def get_queryset(self):
        return NecesidadCapacitacionExterna.objects.all().order_by('-fecha', '-id')

    @transaction.atomic
    def perform_create(self, serializer):
        necesidad = serializer.save(fo_usuario=self.request.user)
        destinatarios = Usuario.objects.filter(rol__in=['administrador', 'recursos_humanos']).exclude(pk=self.request.user.pk)
        for usuario in destinatarios:
            notificar(
                usuario=usuario,
                mensaje_interno=f'Nueva necesidad de capacitación externa: {necesidad.tema} ({necesidad.area})',
                asunto_correo='Nueva necesidad de capacitación externa - TRAINET',
                cuerpo_correo=(
                    f'Hola, {self.request.user.nombre} registró una necesidad de capacitación externa. '
                    f'Tema: {necesidad.tema}. Área: {necesidad.area}. Observaciones: {necesidad.observaciones or "ninguna"}.'
                ),
                ruta=ruta_de_evento(NECESIDAD_NUEVA, usuario.rol)
            )


class CotizacionProveedorViewSet(PermisosProveedoresMixin, viewsets.ModelViewSet):
    queryset = CotizacionProveedor.objects.all()
    serializer_class = CotizacionProveedorSerializer
    http_method_names = METODOS_HTTP

    def get_queryset(self):
        queryset = CotizacionProveedor.objects.all().order_by('-fecha_carga', '-id')
        fo_proveedor = self.request.query_params.get('fo_proveedor')
        estado = self.request.query_params.get('estado')
        if fo_proveedor:
            queryset = queryset.filter(fo_proveedor=fo_proveedor)
        if estado:
            queryset = queryset.filter(estado=estado)
        return queryset

    def perform_create(self, serializer):
        serializer.save(fo_usuario=self.request.user, estado='pendiente')

    @transaction.atomic
    def perform_update(self, serializer):
        previa = serializer.instance
        archivo_anterior = previa.archivo
        nombre_anterior = archivo_anterior.name
        estado_anterior = previa.estado
        reemplaza_archivo = 'archivo' in self.request.FILES

        cotizacion = serializer.save()

        # Un archivo nuevo es otra cotización: vuelve a revisión salvo que se indique un estado.
        if reemplaza_archivo and 'estado' not in self.request.data and cotizacion.estado != 'pendiente':
            cotizacion.estado = 'pendiente'
            cotizacion.save(update_fields=['estado'])

        if reemplaza_archivo and nombre_anterior and nombre_anterior != cotizacion.archivo.name:
            archivo_anterior.delete(save=False)

        if cotizacion.estado == 'aprobada' and estado_anterior != 'aprobada' and cotizacion.fo_usuario:
            notificar(
                usuario=cotizacion.fo_usuario,
                mensaje_interno=f'La cotización #{cotizacion.id} de {cotizacion.fo_proveedor.razon_social} fue aprobada.',
                asunto_correo='Cotización de proveedor aprobada - TRAINET',
                cuerpo_correo=f'Hola, la cotización #{cotizacion.id} de {cotizacion.fo_proveedor.razon_social} fue aprobada.',
                ruta=ruta_de_evento(COTIZACION_APROBADA, cotizacion.fo_usuario.rol)
            )

    def destroy(self, request, *args, **kwargs):
        cotizacion = self.get_object()
        archivo = cotizacion.archivo
        try:
            cotizacion.delete()
        except ProtectedError:
            raise ValidationError('No se puede eliminar la cotización porque está asociada a un acuerdo.')
        if archivo:
            archivo.delete(save=False)
        return Response(status=204)

    @action(detail=True, methods=['get'])
    def descargar(self, request, pk=None):
        return respuesta_archivo(self.get_object().archivo)


class ContratoProveedorViewSet(PermisosProveedoresMixin, viewsets.ModelViewSet):
    queryset = ContratoProveedor.objects.all()
    serializer_class = ContratoProveedorSerializer
    http_method_names = METODOS_HTTP
    acciones_aprobacion = ('decidir',)

    def get_queryset(self):
        queryset = ContratoProveedor.objects.all().order_by('-fecha_inicio', '-id')
        fo_proveedor = self.request.query_params.get('fo_proveedor')
        estado = self.request.query_params.get('estado')
        if fo_proveedor:
            queryset = queryset.filter(fo_proveedor=fo_proveedor)
        if estado:
            queryset = queryset.filter(estado=estado)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        # Todo acuerdo nace pendiente de aprobación, sin importar quién lo cree ni lo que envíe el cliente.
        # No cambia el estado del proveedor: solo cuenta un acuerdo vigente.
        contrato = serializer.save(fo_usuario=self.request.user, estado='pendiente_aprobacion')
        destinatarios = Usuario.objects.filter(rol__in=ROLES_APROBACION_ACUERDOS).exclude(pk=self.request.user.pk)
        for usuario in destinatarios:
            notificar(
                usuario=usuario,
                mensaje_interno=f'Acuerdo #{contrato.id} con {contrato.fo_proveedor.razon_social} pendiente de aprobación.',
                asunto_correo='Acuerdo con proveedor pendiente de aprobación - TRAINET',
                cuerpo_correo=(
                    f'Hola, {self.request.user.nombre} registró el acuerdo #{contrato.id} con '
                    f'{contrato.fo_proveedor.razon_social} ({contrato.fecha_inicio} a {contrato.fecha_fin}) '
                    'y requiere tu aprobación.'
                ),
                ruta=ruta_de_evento(ACUERDO_PENDIENTE, usuario.rol)
            )

    @transaction.atomic
    def perform_update(self, serializer):
        archivo_anterior = serializer.instance.archivo
        nombre_anterior = archivo_anterior.name if archivo_anterior else None
        estado_anterior = serializer.instance.estado
        contrato = serializer.save()
        if 'archivo' in self.request.FILES and nombre_anterior and nombre_anterior != contrato.archivo.name:
            archivo_anterior.delete(save=False)
        if contrato.estado != estado_anterior:
            sincronizar_estado_proveedor(contrato.fo_proveedor)

    @transaction.atomic
    def perform_destroy(self, instance):
        if instance.estado not in ('pendiente_aprobacion', 'rechazado'):
            raise ValidationError(
                'Solo se pueden eliminar acuerdos pendientes o rechazados. '
                'Un acuerdo vigente se cierra con Finalizar o Cancelar.'
            )
        proveedor = instance.fo_proveedor
        archivo = instance.archivo
        instance.delete()
        # Un acuerdo pendiente o rechazado nunca contó como vigente: el recálculo deja el estado igual.
        sincronizar_estado_proveedor(proveedor)
        if archivo:
            archivo.delete(save=False)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def decidir(self, request, pk=None):
        contrato = self.get_object()
        if contrato.estado != 'pendiente_aprobacion':
            raise ValidationError('Solo se pueden decidir acuerdos pendientes de aprobación.')

        entrada = DecisionAcuerdoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        datos = entrada.validated_data

        aprobado = datos['estado'] == 'aprobado'
        contrato.estado = 'vigente' if aprobado else 'rechazado'
        contrato.motivo_decision = datos['motivo']
        contrato.fo_aprobador = request.user
        contrato.fecha_decision = timezone.now()
        contrato.save(update_fields=['estado', 'motivo_decision', 'fo_aprobador', 'fecha_decision'])

        if aprobado:
            sincronizar_estado_proveedor(contrato.fo_proveedor)

        if contrato.fo_usuario:
            resultado = 'aprobado' if aprobado else 'rechazado'
            motivo = f' Motivo: {contrato.motivo_decision}' if contrato.motivo_decision else ''
            mensaje = f'Tu acuerdo #{contrato.id} con {contrato.fo_proveedor.razon_social} fue {resultado}.{motivo}'
            notificar(
                usuario=contrato.fo_usuario,
                mensaje_interno=mensaje[:255],
                asunto_correo='Decisión sobre tu acuerdo con proveedor - TRAINET',
                cuerpo_correo=f'Hola, {mensaje}',
                ruta=ruta_de_evento(ACUERDO_DECISION, contrato.fo_usuario.rol)
            )

        return Response(self.get_serializer(contrato).data)

    @action(detail=True, methods=['get'])
    def descargar(self, request, pk=None):
        contrato = self.get_object()
        if not contrato.archivo:
            raise ValidationError('Este acuerdo no tiene archivo adjunto.')
        return respuesta_archivo(contrato.archivo)
