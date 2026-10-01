from rest_framework.routers import DefaultRouter

from .views import SolicitudRecursosViewSet, TipoRecursoViewSet

router = DefaultRouter()
router.register('tipos-recurso', TipoRecursoViewSet, basename='tipo-recurso')
router.register('solicitudes-recursos', SolicitudRecursosViewSet, basename='solicitud-recursos')

urlpatterns = router.urls
