from rest_framework.routers import DefaultRouter

from .views import (
    CategoriaContenidoViewSet,
    ContenidoViewSet,
    EstadoContenidoViewSet,
    ModuloInventarioContenidoViewSet,
)

router = DefaultRouter()
router.register('modulo-inventario-contenido', ModuloInventarioContenidoViewSet, basename='modulo-inventario-contenido')
router.register('categorias-contenido', CategoriaContenidoViewSet, basename='categoria-contenido')
router.register('estados-contenido', EstadoContenidoViewSet, basename='estado-contenido')
router.register('contenidos', ContenidoViewSet, basename='contenido')

urlpatterns = router.urls
