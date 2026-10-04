from rest_framework.routers import DefaultRouter

from .views import (
    ContratoProveedorViewSet,
    CotizacionProveedorViewSet,
    ModuloGestionProveedoresViewSet,
    NecesidadCapacitacionExternaViewSet,
    ProveedorViewSet,
    ServicioProveedorViewSet,
)

router = DefaultRouter()
router.register('modulo-gestion-proveedores', ModuloGestionProveedoresViewSet, basename='modulo-gestion-proveedores')
router.register('proveedores', ProveedorViewSet, basename='proveedor')
router.register('servicios-proveedor', ServicioProveedorViewSet, basename='servicio-proveedor')
router.register('contratos-proveedor', ContratoProveedorViewSet, basename='contrato-proveedor')
router.register('necesidades-capacitacion-externa', NecesidadCapacitacionExternaViewSet, basename='necesidad-capacitacion-externa')
router.register('cotizaciones-proveedor', CotizacionProveedorViewSet, basename='cotizacion-proveedor')

urlpatterns = router.urls
