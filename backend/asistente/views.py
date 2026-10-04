import os

from django.db import transaction
from django.http import FileResponse
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from usuarios.permissions import permiso_por_roles

from .coincidencia import buscar, limpiar_texto
from .models import (
    BaseConocimiento,
    CategoriaAsistente,
    ConsultaFrecuente,
    HistorialConsulta,
    ModuloAsistenteVirtual,
)
from .permisos import ROLES_ENTRENAMIENTO_ASISTENTE, PermisosAsistenteMixin, puede_entrenar
from .serializers import (
    BaseConocimientoSerializer,
    CategoriaAsistenteSerializer,
    ConsultaFrecuenteSerializer,
    HistorialConsultaSerializer,
    ModuloAsistenteVirtualSerializer,
    PreguntarSerializer,
    SeleccionarSerializer,
    ValorarSerializer,
)

# Sin PUT: las modificaciones parciales van por PATCH.
METODOS_HTTP = ['get', 'post', 'patch', 'delete', 'head', 'options']


def respuesta_archivo(campo_archivo):
    return FileResponse(campo_archivo.open(), as_attachment=True, filename=os.path.basename(campo_archivo.name))


def datos_respuesta(consulta, request):
    return {
        'id': consulta.id,
        'pregunta': consulta.pregunta,
        'respuesta': consulta.respuesta,
        'categoria_nombre': consulta.fo_categoria.nombre if consulta.fo_categoria else None,
        'archivo': request.build_absolute_uri(consulta.archivo.url) if consulta.archivo else None,
        'archivo_nombre': os.path.basename(consulta.archivo.name) if consulta.archivo else None,
    }


def modulo_asistente():
    return ModuloAsistenteVirtual.objects.order_by('id').first()


class ModuloAsistenteVirtualViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ModuloAsistenteVirtual.objects.all()
    serializer_class = ModuloAsistenteVirtualSerializer
    permission_classes = [IsAuthenticated]


class CategoriaAsistenteViewSet(PermisosAsistenteMixin, viewsets.ModelViewSet):
    queryset = CategoriaAsistente.objects.all()
    serializer_class = CategoriaAsistenteSerializer
    http_method_names = METODOS_HTTP

    def get_queryset(self):
        return CategoriaAsistente.objects.all().order_by('orden', 'nombre')

    def perform_create(self, serializer):
        if 'fo_mod_asistente' in serializer.validated_data:
            serializer.save()
        else:
            serializer.save(fo_mod_asistente=modulo_asistente())

    def perform_destroy(self, instance):
        if instance.consultafrecuente_set.exists():
            raise ValidationError('No se puede eliminar la categoría porque tiene preguntas frecuentes. '
                                  'Muévelas a otra categoría o desactívalas.')
        instance.delete()


class ConsultaFrecuenteViewSet(PermisosAsistenteMixin, viewsets.ModelViewSet):
    queryset = ConsultaFrecuente.objects.all()
    serializer_class = ConsultaFrecuenteSerializer
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [filters.SearchFilter]
    search_fields = ['pregunta', 'respuesta', 'palabras_clave']
    http_method_names = METODOS_HTTP

    def get_queryset(self):
        queryset = ConsultaFrecuente.objects.select_related('fo_categoria').order_by(
            'fo_categoria__orden', 'pregunta', 'id')
        params = self.request.query_params
        if puede_entrenar(self.request.user):
            activa = params.get('activa')
            if activa in ('true', '1'):
                queryset = queryset.filter(activa=True)
            elif activa in ('false', '0'):
                queryset = queryset.filter(activa=False)
        else:
            queryset = queryset.filter(activa=True)
        if params.get('categoria'):
            queryset = queryset.filter(fo_categoria=params['categoria'])
        return queryset

    def perform_create(self, serializer):
        if 'fo_mod_asistente' in serializer.validated_data:
            serializer.save()
        else:
            serializer.save(fo_mod_asistente=modulo_asistente())

    def perform_update(self, serializer):
        archivo_anterior = serializer.instance.archivo
        nombre_anterior = archivo_anterior.name if archivo_anterior else None
        consulta = serializer.save()
        if nombre_anterior and nombre_anterior != (consulta.archivo.name if consulta.archivo else None):
            archivo_anterior.storage.delete(nombre_anterior)

    def perform_destroy(self, instance):
        archivo = instance.archivo
        nombre = archivo.name if archivo else None
        with transaction.atomic():
            instance.delete()
        if nombre:
            archivo.storage.delete(nombre)

    @action(detail=True, methods=['get'])
    def descargar(self, request, pk=None):
        consulta = self.get_object()
        if not consulta.archivo:
            raise NotFound('Esta respuesta no tiene archivo adjunto.')
        return respuesta_archivo(consulta.archivo)


class BaseConocimientoViewSet(viewsets.ModelViewSet):
    queryset = BaseConocimiento.objects.all()
    serializer_class = BaseConocimientoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles(*ROLES_ENTRENAMIENTO_ASISTENTE)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class HistorialConsultaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = HistorialConsulta.objects.all()
    serializer_class = HistorialConsultaSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['pregunta_usuario', 'fo_usuario__nombre', 'fo_consulta_frecuente__pregunta']

    def get_queryset(self):
        queryset = HistorialConsulta.objects.select_related('fo_usuario', 'fo_consulta_frecuente').order_by(
            '-fecha', '-id')
        if not puede_entrenar(self.request.user):
            return queryset.filter(fo_usuario=self.request.user)
        params = self.request.query_params
        for parametro in ('resuelta', 'util'):
            valor = params.get(parametro)
            if valor in ('true', '1'):
                queryset = queryset.filter(**{parametro: True})
            elif valor in ('false', '0'):
                queryset = queryset.filter(**{parametro: False})
        if params.get('usuario'):
            queryset = queryset.filter(fo_usuario=params['usuario'])
        return queryset

    @action(detail=True, methods=['post'])
    def valorar(self, request, pk=None):
        entrada = ValorarSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        # Solo el dueño valora: la fila de otro usuario responde 404 (también para el administrador).
        historial = HistorialConsulta.objects.filter(pk=pk, fo_usuario=request.user).first()
        if historial is None:
            raise NotFound()
        historial.util = entrada.validated_data['util']
        campos = ['util']
        if historial.util is False:
            historial.resuelta = False
            campos.append('resuelta')
        historial.save(update_fields=campos)
        return Response(self.get_serializer(historial).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def preguntar(request):
    entrada = PreguntarSerializer(data=request.data)
    entrada.is_valid(raise_exception=True)
    texto = limpiar_texto(entrada.validated_data['texto'])
    if not texto:
        return Response({'texto': ['Escribe tu pregunta.']}, status=status.HTTP_400_BAD_REQUEST)

    activas = ConsultaFrecuente.objects.filter(activa=True).select_related('fo_categoria')
    mejor, sugerencias, _ = buscar(texto, activas)
    historial = HistorialConsulta.objects.create(
        fo_usuario=request.user,
        pregunta_usuario=texto,
        origen='texto',
        resuelta=mejor is not None,
        fo_consulta_frecuente=mejor,
    )
    return Response({
        'historial_id': historial.id,
        'resuelta': mejor is not None,
        'respuesta': datos_respuesta(mejor, request) if mejor else None,
        'sugerencias': [] if mejor else [{'id': c.id, 'pregunta': c.pregunta} for c in sugerencias],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def seleccionar(request):
    entrada = SeleccionarSerializer(data=request.data)
    entrada.is_valid(raise_exception=True)
    consulta = ConsultaFrecuente.objects.filter(
        pk=entrada.validated_data['consulta'], activa=True).select_related('fo_categoria').first()
    if consulta is None:
        raise NotFound('La pregunta seleccionada no existe o no está disponible.')
    historial = HistorialConsulta.objects.create(
        fo_usuario=request.user,
        pregunta_usuario=consulta.pregunta[:300],
        origen='menu',
        resuelta=True,
        fo_consulta_frecuente=consulta,
    )
    return Response({
        'historial_id': historial.id,
        'resuelta': True,
        'respuesta': datos_respuesta(consulta, request),
        'sugerencias': [],
    })
