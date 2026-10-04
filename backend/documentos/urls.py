from rest_framework.routers import DefaultRouter

from .views import (
    CategoriaDocumentoViewSet,
    DocumentoViewSet,
    HistorialAccesoDocumentoViewSet,
    ModuloGestionDocumentalViewSet,
    TipoDocumentoViewSet,
)

router = DefaultRouter()
router.register('modulo-gestion-documental', ModuloGestionDocumentalViewSet, basename='modulo-gestion-documental')
router.register('tipos-documento', TipoDocumentoViewSet, basename='tipo-documento')
router.register('categorias-documento', CategoriaDocumentoViewSet, basename='categoria-documento')
router.register('documentos', DocumentoViewSet, basename='documento')
router.register('historial-documentos', HistorialAccesoDocumentoViewSet, basename='historial-documento')

urlpatterns = router.urls
