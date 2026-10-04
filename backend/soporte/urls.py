from rest_framework.routers import DefaultRouter

from .views import (
    CategoriaTicketViewSet,
    EvidenciaTicketViewSet,
    ModuloSoporteTecnicoViewSet,
    TicketSoporteViewSet,
)

router = DefaultRouter()
router.register('modulo-soporte-tecnico', ModuloSoporteTecnicoViewSet, basename='modulo-soporte-tecnico')
router.register('categorias-ticket', CategoriaTicketViewSet, basename='categoria-ticket')
router.register('tickets-soporte', TicketSoporteViewSet, basename='ticket-soporte')
router.register('evidencias-ticket', EvidenciaTicketViewSet, basename='evidencia-ticket')

urlpatterns = router.urls
