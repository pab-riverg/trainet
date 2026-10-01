from rest_framework.routers import DefaultRouter

from .views import DocumentoViewSet, HistorialAccesoDocumentoViewSet

router = DefaultRouter()
router.register('documentos', DocumentoViewSet, basename='documento')
router.register('historial-documentos', HistorialAccesoDocumentoViewSet, basename='historial-documento')

urlpatterns = router.urls
