from django.urls import path

from .views import InicioView

urlpatterns = [
    path('inicio/', InicioView.as_view(), name='inicio'),
]
