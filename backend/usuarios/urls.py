from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CambiarPasswordView,
    CapacitadorViewSet,
    EmpleadoViewSet,
    SolicitarRecuperacionView,
    SupervisorViewSet,
    TecnicoSoporteViewSet,
    UsuarioViewSet,
)

router = DefaultRouter()
router.register('usuarios', UsuarioViewSet, basename='usuario')
router.register('empleados', EmpleadoViewSet, basename='empleado')
router.register('capacitadores', CapacitadorViewSet, basename='capacitador')
router.register('supervisores', SupervisorViewSet, basename='supervisor')
router.register('tecnicos-soporte', TecnicoSoporteViewSet, basename='tecnico-soporte')

urlpatterns = [
    path('usuarios/cambiar-password/', CambiarPasswordView.as_view(), name='cambiar-password'),
    path('usuarios/solicitar-recuperacion/', SolicitarRecuperacionView.as_view(), name='solicitar-recuperacion'),
] + router.urls
