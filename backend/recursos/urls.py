from rest_framework.routers import DefaultRouter

from .views import ModuloPedidoRecursosViewSet, SolicitudRecursosViewSet, TipoRecursoViewSet

router = DefaultRouter()
router.register('modulo-pedido-recursos', ModuloPedidoRecursosViewSet, basename='modulo-pedido-recursos')
router.register('tipos-recurso', TipoRecursoViewSet, basename='tipo-recurso')
router.register('solicitudes-recursos', SolicitudRecursosViewSet, basename='solicitud-recursos')

urlpatterns = router.urls
