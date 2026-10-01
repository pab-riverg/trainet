from rest_framework.routers import DefaultRouter

from .views import ContenidoViewSet

router = DefaultRouter()
router.register('contenidos', ContenidoViewSet, basename='contenido')

urlpatterns = router.urls
