from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notificacion
from .serializers import NotificacionSerializer


class NotificacionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Notificacion.objects.filter(fo_usuario=self.request.user).order_by('-fecha', '-id')
        leida = self.request.query_params.get('leida')
        if leida is not None:
            queryset = queryset.filter(leida=leida.lower() == 'true')
        return queryset

    @action(detail=True, methods=['post'])
    def marcar_leida(self, request, pk=None):
        notificacion = self.get_object()
        notificacion.leida = True
        notificacion.save(update_fields=['leida'])
        serializer = self.get_serializer(notificacion)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='no-leidas')
    def no_leidas(self, request):
        total = Notificacion.objects.filter(fo_usuario=request.user, leida=False).count()
        return Response({'total': total})

    @action(detail=False, methods=['post'], url_path='marcar-todas-leidas')
    def marcar_todas_leidas(self, request):
        actualizadas = Notificacion.objects.filter(fo_usuario=request.user, leida=False).update(leida=True)
        return Response({'actualizadas': actualizadas})
