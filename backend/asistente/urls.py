from rest_framework.routers import DefaultRouter

from .views import (
    BaseConocimientoViewSet,
    ConsultaFrecuenteViewSet,
    HistorialConsultaViewSet,
)

router = DefaultRouter()
router.register('consultas-frecuentes', ConsultaFrecuenteViewSet, basename='consulta-frecuente')
router.register('base-conocimiento', BaseConocimientoViewSet, basename='base-conocimiento')
router.register('historial-consultas', HistorialConsultaViewSet, basename='historial-consulta')

urlpatterns = router.urls
