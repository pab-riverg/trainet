from rest_framework.routers import DefaultRouter

from .views import EvidenciaTicketViewSet, TicketSoporteViewSet

router = DefaultRouter()
router.register('tickets-soporte', TicketSoporteViewSet, basename='ticket-soporte')
router.register('evidencias-ticket', EvidenciaTicketViewSet, basename='evidencia-ticket')

urlpatterns = router.urls
