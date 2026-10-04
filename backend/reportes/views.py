import os
import json
from datetime import date, timedelta

from django.db.models import Count
from django.db.models.functions import ExtractMonth, ExtractYear
from django.http import FileResponse, HttpResponse
from django.utils import timezone
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from usuarios.permissions import permiso_por_roles

from administracion import auditoria

from . import consolidado, importacion
from .exportadores import EXPORTADORES
from .generadores import GENERADORES
from .models import (
    ArchivoImportado,
    DatoReporte,
    FrecuenciaReporte,
    ModuloReportes,
    ParametroReporte,
    Reporte,
    TipoReporte,
)
from .permisos import (
    ROLES_ARCHIVOS_REPORTES,
    TIPO_CONSOLIDADO,
    PermisosReportesMixin,
    filtrar_archivos,
    filtrar_informes,
    filtrar_tipos,
    puede_usar_tipo,
    puede_ver_informe,
)
from .serializers import (
    ArchivoImportadoSerializer,
    InformeDetalleSerializer,
    InformeListaSerializer,
    DatoReporteSerializer,
    FrecuenciaReporteSerializer,
    ModuloReportesSerializer,
    ParametroReporteSerializer,
    ReporteSerializer,
    TipoReporteSerializer,
)

# Sin PUT: las modificaciones parciales van por PATCH.
METODOS_HTTP = ['get', 'post', 'patch', 'delete', 'head', 'options']

MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
         'septiembre', 'octubre', 'noviembre', 'diciembre']


def entero_o_error(valor, nombre):
    try:
        return int(valor)
    except (TypeError, ValueError):
        raise ValidationError({nombre: 'Debe ser un número entero.'})


def fecha_o_error(valor, nombre):
    try:
        return date.fromisoformat(valor)
    except ValueError:
        raise ValidationError({nombre: 'Usa el formato AAAA-MM-DD.'})


class ModuloReportesViewSet(PermisosReportesMixin, viewsets.ReadOnlyModelViewSet):
    queryset = ModuloReportes.objects.all()
    serializer_class = ModuloReportesSerializer


class TipoReporteViewSet(PermisosReportesMixin, viewsets.ModelViewSet):
    queryset = TipoReporte.objects.all()
    serializer_class = TipoReporteSerializer

    def get_queryset(self):
        # Cada rol ve solo los tipos que le corresponden (administrador y directivo, todos).
        queryset = filtrar_tipos(TipoReporte.objects.all(), self.request.user).order_by('nombre_tipo', 'id')
        origen = self.request.query_params.get('origen')
        if origen:
            queryset = queryset.filter(origen=origen)
        if origen == 'sistema':
            # El consolidado se genera desde archivos, no por rango de fechas.
            queryset = queryset.exclude(clave='consolidado')
        return queryset


class FrecuenciaReporteViewSet(viewsets.ModelViewSet):
    queryset = FrecuenciaReporte.objects.all()
    serializer_class = FrecuenciaReporteSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'directivo')]


class ReporteViewSet(viewsets.ModelViewSet):
    queryset = Reporte.objects.all()
    serializer_class = ReporteSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'directivo')]

    def perform_create(self, serializer):
        serializer.save(fo_usuario=self.request.user)


class DatoReporteViewSet(viewsets.ModelViewSet):
    queryset = DatoReporte.objects.all()
    serializer_class = DatoReporteSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'directivo')]


class ParametroReporteViewSet(viewsets.ModelViewSet):
    queryset = ParametroReporte.objects.all()
    serializer_class = ParametroReporteSerializer
    permission_classes = [IsAuthenticated, permiso_por_roles('administrador', 'directivo')]


class ArchivoImportadoViewSet(PermisosReportesMixin, viewsets.ModelViewSet):
    queryset = ArchivoImportado.objects.all()
    serializer_class = ArchivoImportadoSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['titulo']
    http_method_names = METODOS_HTTP
    # Importar y gestionar archivos: administrador y roles con permiso de importar (estos, solo los suyos).
    acciones_gestion = ()
    acciones_importacion = ('create', 'update', 'partial_update', 'destroy', 'archivar', 'restaurar')
    roles_lectura = ROLES_ARCHIVOS_REPORTES

    def filtrar(self, queryset, params):
        """Filtros comunes de la lista y de las carpetas (sobre fecha_documento)."""
        if params.get('tipo'):
            queryset = queryset.filter(fo_tipo=entero_o_error(params['tipo'], 'tipo'))
        if params.get('anio'):
            queryset = queryset.filter(fecha_documento__year=entero_o_error(params['anio'], 'anio'))
        if params.get('mes'):
            mes = entero_o_error(params['mes'], 'mes')
            if not 1 <= mes <= 12:
                raise ValidationError({'mes': 'Debe estar entre 1 y 12.'})
            queryset = queryset.filter(fecha_documento__month=mes)
        if params.get('desde'):
            queryset = queryset.filter(fecha_documento__gte=fecha_o_error(params['desde'], 'desde'))
        if params.get('hasta'):
            queryset = queryset.filter(fecha_documento__lte=fecha_o_error(params['hasta'], 'hasta'))
        return queryset

    def get_queryset(self):
        # Fuera del alcance del usuario (archivos ajenos) el archivo no existe: 404.
        queryset = filtrar_archivos(ArchivoImportado.objects.select_related('fo_tipo', 'fo_usuario'), self.request.user)
        if self.action == 'list':
            params = self.request.query_params
            activo = params.get('activo', 'true')
            if activo in ('true', '1'):
                queryset = queryset.filter(activo=True)
            elif activo in ('false', '0'):
                queryset = queryset.filter(activo=False)
            queryset = self.filtrar(queryset, params)
        return queryset.order_by('-fecha_documento', '-id')

    def perform_create(self, serializer):
        modulo = ModuloReportes.objects.order_by('id').first()
        archivo = serializer.save(fo_usuario=self.request.user, fo_mod_reportes=modulo)
        auditoria.registrar(self.request.user, 'archivo_importado', 'reportes',
                            f'Archivo "{archivo.titulo}" ({archivo.formato}, {archivo.filas} filas)', self.request)

    def perform_destroy(self, instance):
        if instance.activo:
            raise ValidationError('Archiva el archivo antes de eliminarlo.')
        if instance.informes.exists():
            raise ValidationError('Está incluido en informes; elimínalos o déjalo archivado.')
        archivo = instance.archivo
        nombre = archivo.name if archivo else None
        titulo = instance.titulo
        instance.delete()
        if nombre:
            archivo.storage.delete(nombre)
        auditoria.registrar(self.request.user, 'archivo_eliminado', 'reportes', f'Archivo "{titulo}"', self.request)

    @action(detail=True, methods=['get'])
    def descargar(self, request, pk=None):
        registro = self.get_object()
        if not registro.archivo:
            raise NotFound('El archivo no está disponible.')
        return FileResponse(registro.archivo.open('rb'), as_attachment=True,
                            filename=os.path.basename(registro.archivo.name))

    @action(detail=True, methods=['get'], url_path='vista-previa')
    def vista_previa(self, request, pk=None):
        registro = self.get_object()
        if not registro.archivo:
            raise NotFound('El archivo no está disponible.')
        with registro.archivo.open('rb') as f:
            contenido = f.read()
        try:
            encabezados, filas, total = importacion.leer(contenido, registro.formato, limite_filas=20)
        except importacion.ErrorImportacion as error:
            raise ValidationError(str(error))
        return Response({'encabezados': encabezados, 'filas': filas, 'total_filas': total})

    @action(detail=True, methods=['post'])
    def archivar(self, request, pk=None):
        registro = self.get_object()
        if not registro.activo:
            raise ValidationError('El archivo ya está archivado.')
        registro.activo = False
        registro.save(update_fields=['activo'])
        auditoria.registrar(request.user, 'archivo_archivado', 'reportes', f'Archivo "{registro.titulo}"', request)
        return Response(self.get_serializer(registro).data)

    @action(detail=True, methods=['post'])
    def restaurar(self, request, pk=None):
        registro = self.get_object()
        if registro.activo:
            raise ValidationError('El archivo no está archivado.')
        registro.activo = True
        registro.save(update_fields=['activo'])
        auditoria.registrar(request.user, 'archivo_restaurado', 'reportes', f'Archivo "{registro.titulo}"', request)
        return Response(self.get_serializer(registro).data)

    @action(detail=False, methods=['get'])
    def carpetas(self, request):
        """Carpetas virtuales: archivos activos agrupados por año, mes (de fecha_documento) y tipo."""
        queryset = self.filtrar(filtrar_archivos(ArchivoImportado.objects.filter(activo=True), request.user),
                                request.query_params)
        grupos = (queryset
                  .annotate(anio=ExtractYear('fecha_documento'), mes=ExtractMonth('fecha_documento'))
                  .values('anio', 'mes', 'fo_tipo', 'fo_tipo__nombre_tipo')
                  .annotate(total=Count('id'))
                  .order_by('-anio', '-mes', 'fo_tipo__nombre_tipo'))
        carpetas = [{
            'anio': g['anio'],
            'mes': g['mes'],
            'mes_nombre': MESES[g['mes'] - 1],
            'tipo_id': g['fo_tipo'],
            'tipo_nombre': g['fo_tipo__nombre_tipo'],
            'total': g['total'],
        } for g in grupos]
        return Response({'carpetas': carpetas, 'total_general': sum(c['total'] for c in carpetas)})


DIAS_POR_DEFECTO = 30
MAX_DIAS_RANGO = 366


def rango_de_fechas(datos):
    """Valida desde/hasta del cuerpo; por defecto los últimos 30 días (incluido hoy)."""
    hoy = timezone.localdate()
    hasta = fecha_o_error(str(datos['hasta']), 'hasta') if datos.get('hasta') else hoy
    desde = fecha_o_error(str(datos['desde']), 'desde') if datos.get('desde') else hasta - timedelta(days=DIAS_POR_DEFECTO - 1)
    if desde > hasta:
        raise ValidationError({'desde': 'La fecha inicial no puede ser posterior a la final.'})
    if (hasta - desde).days + 1 > MAX_DIAS_RANGO:
        raise ValidationError({'hasta': f'El rango máximo es de {MAX_DIAS_RANGO} días.'})
    return desde, hasta


class InformeViewSet(PermisosReportesMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin,
                     mixins.DestroyModelMixin, viewsets.GenericViewSet):
    """Historial de informes (instantáneas) y su generación/exportación. Sin PUT ni PATCH."""

    queryset = Reporte.objects.all()
    http_method_names = ['get', 'post', 'delete', 'head', 'options']
    filter_backends = [filters.SearchFilter]
    search_fields = ['titulo']
    # Leer, generar y exportar: cada rol de Reportes, solo de sus tipos; consolidar: roles con permiso de
    # consolidar; borrar: solo administrador.
    acciones_gestion = ('destroy',)
    acciones_consolidacion = ('consolidar',)

    def get_serializer_class(self):
        return InformeDetalleSerializer if self.action == 'retrieve' else InformeListaSerializer

    def get_queryset(self):
        queryset = (Reporte.objects.select_related('fo_tipo_reporte', 'fo_usuario')
                    .annotate(total_archivos=Count('archivos', distinct=True)))
        if self.action == 'retrieve':
            queryset = queryset.prefetch_related('archivos')
        if self.action == 'list':
            # El historial solo muestra informes de los tipos permitidos al rol.
            queryset = filtrar_informes(queryset, self.request.user)
            params = self.request.query_params
            if params.get('tipo'):
                queryset = queryset.filter(fo_tipo_reporte=entero_o_error(params['tipo'], 'tipo'))
            if params.get('desde'):
                queryset = queryset.filter(fecha_generacion__gte=fecha_o_error(params['desde'], 'desde'))
            if params.get('hasta'):
                queryset = queryset.filter(fecha_generacion__lte=fecha_o_error(params['hasta'], 'hasta'))
        return queryset.order_by('-fecha_generacion', '-id')

    def get_object(self):
        # Detalle y exportación de un informe de otro tipo (o consolidado ajeno): 403.
        reporte = super().get_object()
        if not puede_ver_informe(self.request.user, reporte):
            raise PermissionDenied('No tienes permiso para ver este informe.')
        return reporte

    def _responder_creado(self, reporte):
        reporte = self.get_queryset().prefetch_related('archivos').get(pk=reporte.pk)
        return Response(InformeDetalleSerializer(reporte, context=self.get_serializer_context()).data,
                        status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def generar(self, request):
        valor = request.data.get('tipo')
        if valor in (None, ''):
            raise ValidationError({'tipo': 'Elige el tipo de informe.'})
        tipos = TipoReporte.objects.filter(origen='sistema').exclude(clave='consolidado')
        tipo = tipos.filter(pk=valor).first() if str(valor).isdigit() else tipos.filter(clave=valor).first()
        if tipo is None:
            raise ValidationError({'tipo': 'El tipo de informe no existe.'})
        if not puede_usar_tipo(request.user, tipo.clave):
            raise PermissionDenied('No tienes permiso para generar informes de este tipo.')
        generador = GENERADORES.get(tipo.clave)
        if generador is None:
            raise ValidationError({'tipo': 'Este tipo de informe aún no está disponible.'})

        desde, hasta = rango_de_fechas(request.data)
        informe = generador(desde, hasta)
        reporte = Reporte.objects.create(
            titulo=informe['titulo'], fo_tipo_reporte=tipo, fo_usuario=request.user,
            fo_mod_reportes=ModuloReportes.objects.order_by('id').first(),
            parametros=json.dumps({'desde': desde.isoformat(), 'hasta': hasta.isoformat()}),
            contenido=json.dumps(informe, ensure_ascii=False, default=str),
        )
        auditoria.registrar(request.user, 'informe_generado', 'reportes',
                            f'{informe["titulo"]} ({desde:%d/%m/%Y} a {hasta:%d/%m/%Y})', request)
        return self._responder_creado(reporte)

    @action(detail=False, methods=['post'])
    def consolidar(self, request):
        ids = request.data.get('archivos')
        if not isinstance(ids, list) or not all(isinstance(i, int) and not isinstance(i, bool) for i in ids):
            raise ValidationError({'archivos': 'Envía la lista de ids de los archivos a consolidar.'})
        ids = list(dict.fromkeys(ids))
        if not puede_usar_tipo(request.user, TIPO_CONSOLIDADO):
            raise PermissionDenied('No tienes permiso para consolidar archivos.')
        # Solo los archivos del alcance del usuario: uno ajeno responde como inexistente.
        archivos = list(filtrar_archivos(ArchivoImportado.objects.filter(pk__in=ids), request.user)
                        .select_related('fo_tipo'))
        if len(archivos) != len(ids):
            raise ValidationError({'archivos': 'Alguno de los archivos no existe.'})
        archivos.sort(key=lambda a: ids.index(a.pk))
        try:
            informe = consolidado.construir(archivos, (request.data.get('titulo') or '').strip() or None)
        except consolidado.ErrorConsolidado as error:
            raise ValidationError({'archivos': str(error)})

        tipo = TipoReporte.objects.filter(clave='consolidado').first()
        if tipo is None:
            raise ValidationError('Falta el tipo "Consolidado de archivos"; ejecuta seed_trainet.')
        reporte = Reporte.objects.create(
            titulo=informe['titulo'][:255], fo_tipo_reporte=tipo, fo_usuario=request.user,
            fo_mod_reportes=ModuloReportes.objects.order_by('id').first(),
            parametros=json.dumps({'archivos': ids}),
            contenido=json.dumps(informe, ensure_ascii=False, default=str),
        )
        reporte.archivos.set(archivos)
        auditoria.registrar(request.user, 'informe_consolidado', 'reportes',
                            f'{reporte.titulo} ({len(archivos)} archivos)', request)
        return self._responder_creado(reporte)

    @action(detail=True, methods=['get'])
    def exportar(self, request, pk=None):
        formato = request.query_params.get('formato', '')
        if formato not in EXPORTADORES:
            raise ValidationError({'formato': 'Formato no válido. Usa pdf, xlsx o docx.'})
        reporte = self.get_object()
        try:
            informe = json.loads(reporte.contenido)
        except ValueError:
            raise ValidationError('El informe no tiene contenido para exportar.')
        funcion, tipo_mime, extension = EXPORTADORES[formato]
        clave = reporte.fo_tipo_reporte.clave or 'informe'
        nombre = f'trainet-{clave}-{reporte.fecha_generacion:%Y%m%d}.{extension}'
        respuesta = HttpResponse(funcion(informe), content_type=tipo_mime)
        auditoria.registrar(request.user, 'informe_exportado', 'reportes',
                            f'{reporte.titulo} en formato {formato}', request)
        respuesta['Content-Disposition'] = f'attachment; filename="{nombre}"'
        return respuesta

    def perform_destroy(self, instance):
        titulo = instance.titulo
        instance.delete()
        auditoria.registrar(self.request.user, 'informe_eliminado', 'reportes', f'Informe "{titulo}"', self.request)
