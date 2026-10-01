from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CambiarPasswordView, EmpleadoViewSet, UsuarioViewSet

router = DefaultRouter()
router.register('usuarios', UsuarioViewSet, basename='usuario')
router.register('empleados', EmpleadoViewSet, basename='empleado')

urlpatterns = [
    path('usuarios/cambiar-password/', CambiarPasswordView.as_view(), name='cambiar-password'),
] + router.urls
