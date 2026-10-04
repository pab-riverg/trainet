from rest_framework.routers import DefaultRouter

from .views import (
    ArticuloViewSet,
    CategoriaArticuloViewSet,
    CotizacionCompraViewSet,
    FacturaCompraViewSet,
    ItemOrdenViewSet,
    ModuloComprasInternasViewSet,
    OrdenCompraViewSet,
    SolicitudCompraViewSet,
)

router = DefaultRouter()
router.register('modulo-compras-internas', ModuloComprasInternasViewSet, basename='modulo-compras-internas')
router.register('categorias-articulo', CategoriaArticuloViewSet, basename='categoria-articulo')
router.register('articulos', ArticuloViewSet, basename='articulo')
router.register('solicitudes-compra', SolicitudCompraViewSet, basename='solicitud-compra')
router.register('ordenes-compra', OrdenCompraViewSet, basename='orden-compra')
router.register('items-orden', ItemOrdenViewSet, basename='item-orden')
router.register('facturas-compra', FacturaCompraViewSet, basename='factura-compra')
router.register('cotizaciones-compra', CotizacionCompraViewSet, basename='cotizacion-compra')

urlpatterns = router.urls
