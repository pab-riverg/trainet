"""
URL configuration for trainet_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import include, path, re_path
from django.views.decorators.http import require_safe
from administracion.autenticacion import TokenObtainPairAuditadoView
from rest_framework_simplejwt.views import TokenRefreshView


@require_safe
def aplicacion_angular(request, ruta=''):
    """Entrega el index.html de Angular para que el router del frontend resuelva la ruta (/login, /dashboard...)."""
    index = settings.FRONTEND_DIR / 'index.html'
    if not index.is_file():
        raise Http404('El frontend compilado no está desplegado.')
    respuesta = FileResponse(index.open('rb'), content_type='text/html; charset=utf-8')
    respuesta['Cache-Control'] = 'no-cache'
    return respuesta


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('usuarios.urls')),
    path('api/', include('administracion.urls')),
    path('api/', include('capacitacion.urls')),
    path('api/', include('documentos.urls')),
    path('api/', include('soporte.urls')),
    path('api/', include('inventario.urls')),
    path('api/', include('recursos.urls')),
    path('api/', include('proveedores.urls')),
    path('api/', include('compras.urls')),
    path('api/', include('asistente.urls')),
    path('api/', include('reportes.urls')),
    path('api/', include('notificaciones.urls')),
    path('api/', include('inicio.urls')),
    path('api/', include('dashboard.urls')),
    path('api/', include('busqueda.urls')),
    path('api/token/', TokenObtainPairAuditadoView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # Última ruta: cualquier otra dirección la resuelve Angular (excepto la API, el admin y los estáticos).
    re_path(r'^(?!api/|admin/|static/|media/)(?P<ruta>.*)$', aplicacion_angular),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
