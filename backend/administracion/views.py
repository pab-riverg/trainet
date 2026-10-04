from datetime import date

from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from reportes.generadores.base import limites
from usuarios.permissions import permiso_por_roles

from . import auditoria, configuracion
from .auditoria import ACCIONES, MODULOS
from .models import DocumentoInstitucional, LogAuditoria
from .panel import datos_panel
from .permisos import permisos_administracion
from .serializers import DocumentoInstitucionalSerializer, LogAuditoriaSerializer


class DocumentoInstitucionalViewSet(viewsets.ModelViewSet):
    queryset = DocumentoInstitucional.objects.all()
    serializer_class = DocumentoInstitucionalSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'encargado_administrativo')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def perform_create(self, serializer):
        serializer.save(fo_usuario=self.request.user)


class ConfiguracionView(APIView):
    """GET: configuración pública (cualquier autenticado). PATCH: solo administrador, solo claves de la lista blanca."""

    def get_permissions(self):
        if self.request.method == 'PATCH':
            return permisos_administracion()
        return [IsAuthenticated()]

    def get(self, request):
        return Response(configuracion.configuracion_publica())

    def patch(self, request):
        datos = request.data
        if not hasattr(datos, 'keys') or not list(datos.keys()):
            raise ValidationError({'nombre_equipo': ['Envía el nombre del equipo.']})
        try:
            cambiados = configuracion.actualizar({clave: datos[clave] for clave in datos.keys()})
        except configuracion.ErrorConfiguracion as error:
            raise ValidationError({error.campo: [error.mensaje]})

        for clave, anterior, nuevo in cambiados:
            auditoria.registrar(request.user, 'configuracion_cambiada', 'administracion',
                                f'{clave}: "{anterior}" -> "{nuevo}"', request)
        return Response(configuracion.configuracion_publica())


class PanelAdministracionView(APIView):
    """Resumen real por requisito de Administración (solo administrador)."""

    def get_permissions(self):
        return permisos_administracion()

    def get(self, request):
        return Response(datos_panel())


class PaginacionAuditoria(LimitOffsetPagination):
    default_limit = 20
    max_limit = 100


def _fecha(valor, nombre):
    try:
        return date.fromisoformat(valor)
    except ValueError:
        raise ValidationError({nombre: ['Fecha no válida; usa el formato AAAA-MM-DD.']})


class AuditoriaViewSet(viewsets.ReadOnlyModelViewSet):
    """Bitácora de auditoría: solo lectura (POST, PUT, PATCH y DELETE responden 405) y solo administrador."""

    queryset = LogAuditoria.objects.all()
    serializer_class = LogAuditoriaSerializer
    pagination_class = PaginacionAuditoria
    filter_backends = [filters.SearchFilter]
    search_fields = ['descripcion', 'fo_usuario__nombre']
    http_method_names = ['get', 'head', 'options']

    def get_permissions(self):
        return permisos_administracion()

    def get_queryset(self):
        queryset = LogAuditoria.objects.select_related('fo_usuario').order_by('-fecha_hora', '-id')
        params = self.request.query_params
        if params.get('usuario'):
            try:
                queryset = queryset.filter(fo_usuario=int(params['usuario']))
            except ValueError:
                raise ValidationError({'usuario': ['Debe ser el id numérico del usuario.']})
        if params.get('accion'):
            queryset = queryset.filter(accion=params['accion'])
        if params.get('modulo'):
            queryset = queryset.filter(modulo=params['modulo'])

        desde = _fecha(params['desde'], 'desde') if params.get('desde') else None
        hasta = _fecha(params['hasta'], 'hasta') if params.get('hasta') else None
        if desde and hasta and desde > hasta:
            raise ValidationError({'desde': ['La fecha inicial no puede ser posterior a la final.']})
        # Rango inclusivo por fecha local (límites con zona horaria, sin depender de CONVERT_TZ de MySQL).
        if desde:
            queryset = queryset.filter(fecha_hora__gte=limites(desde, desde)[0])
        if hasta:
            queryset = queryset.filter(fecha_hora__lt=limites(hasta, hasta)[1])
        return queryset

    @action(detail=False, methods=['get'])
    def acciones(self, request):
        """Catálogos para llenar los filtros."""
        return Response({
            'acciones': [{'clave': clave, 'etiqueta': etiqueta} for clave, etiqueta in ACCIONES.items()],
            'modulos': [{'clave': clave, 'etiqueta': etiqueta} for clave, etiqueta in MODULOS.items()],
        })
