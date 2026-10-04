from rest_framework.routers import DefaultRouter

from .views import (
    ArchivoImportadoViewSet,
    InformeViewSet,
    DatoReporteViewSet,
    FrecuenciaReporteViewSet,
    ParametroReporteViewSet,
    ModuloReportesViewSet,
    ReporteViewSet,
    TipoReporteViewSet,
)

router = DefaultRouter()
router.register('modulo-reportes', ModuloReportesViewSet, basename='modulo-reportes')
router.register('archivos-importados', ArchivoImportadoViewSet, basename='archivo-importado')
router.register('informes', InformeViewSet, basename='informe')
router.register('tipos-reporte', TipoReporteViewSet, basename='tipo-reporte')
router.register('frecuencias-reporte', FrecuenciaReporteViewSet, basename='frecuencia-reporte')
router.register('reportes', ReporteViewSet, basename='reporte')
router.register('datos-reporte', DatoReporteViewSet, basename='dato-reporte')
router.register('parametros-reporte', ParametroReporteViewSet, basename='parametro-reporte')

urlpatterns = router.urls
