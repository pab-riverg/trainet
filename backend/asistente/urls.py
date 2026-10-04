from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    BaseConocimientoViewSet,
    CategoriaAsistenteViewSet,
    ConsultaFrecuenteViewSet,
    HistorialConsultaViewSet,
    ModuloAsistenteVirtualViewSet,
    preguntar,
    seleccionar,
)

router = DefaultRouter()
router.register('modulo-asistente-virtual', ModuloAsistenteVirtualViewSet, basename='modulo-asistente-virtual')
router.register('categorias-asistente', CategoriaAsistenteViewSet, basename='categoria-asistente')
router.register('consultas-frecuentes', ConsultaFrecuenteViewSet, basename='consulta-frecuente')
router.register('base-conocimiento', BaseConocimientoViewSet, basename='base-conocimiento')
router.register('historial-consultas', HistorialConsultaViewSet, basename='historial-consulta')

urlpatterns = [
    path('asistente/preguntar/', preguntar, name='asistente-preguntar'),
    path('asistente/seleccionar/', seleccionar, name='asistente-seleccionar'),
] + router.urls
