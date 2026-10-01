from rest_framework.routers import DefaultRouter

from .views import DocumentoInstitucionalViewSet

router = DefaultRouter()
router.register('documentos-institucionales', DocumentoInstitucionalViewSet, basename='documento-institucional')

urlpatterns = router.urls
