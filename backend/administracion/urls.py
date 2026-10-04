from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AuditoriaViewSet, ConfiguracionView, DocumentoInstitucionalViewSet, PanelAdministracionView

router = DefaultRouter()
router.register('documentos-institucionales', DocumentoInstitucionalViewSet, basename='documento-institucional')
router.register('auditoria', AuditoriaViewSet, basename='auditoria')

urlpatterns = [
    path('configuracion/', ConfiguracionView.as_view(), name='configuracion'),
    path('administracion/panel/', PanelAdministracionView.as_view(), name='panel-administracion'),
] + router.urls
