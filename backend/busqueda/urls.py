from django.urls import path

from .views import BuscarView

urlpatterns = [
    path('buscar/', BuscarView.as_view(), name='buscar'),
]
