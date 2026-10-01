from rest_framework.routers import DefaultRouter

from .views import CotizacionCompraViewSet, ItemOrdenViewSet, OrdenCompraViewSet

router = DefaultRouter()
router.register('ordenes-compra', OrdenCompraViewSet, basename='orden-compra')
router.register('items-orden', ItemOrdenViewSet, basename='item-orden')
router.register('cotizaciones-compra', CotizacionCompraViewSet, basename='cotizacion-compra')

urlpatterns = router.urls
