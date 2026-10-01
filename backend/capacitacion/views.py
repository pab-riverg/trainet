from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from notificaciones.utils import notificar
from usuarios.permissions import permiso_por_roles

from .models import (
    Capacitacion,
    Curso,
    EvidenciaParticipacion,
    MaterialEducativo,
    ParticipanteCapacitacion,
    ProgresoCurso,
)
from .serializers import (
    CapacitacionSerializer,
    CursoSerializer,
    EvidenciaParticipacionSerializer,
    MaterialEducativoSerializer,
    ParticipanteCapacitacionSerializer,
    ProgresoCursoSerializer,
)


class CursoViewSet(viewsets.ModelViewSet):
    queryset = Curso.objects.all()
    serializer_class = CursoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('capacitador', 'encargado_formacion', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class CapacitacionViewSet(viewsets.ModelViewSet):
    queryset = Capacitacion.objects.all()
    serializer_class = CapacitacionSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('recursos_humanos', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class MaterialEducativoViewSet(viewsets.ModelViewSet):
    queryset = MaterialEducativo.objects.all()
    serializer_class = MaterialEducativoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('capacitador', 'encargado_formacion', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class ParticipanteCapacitacionViewSet(viewsets.ModelViewSet):
    queryset = ParticipanteCapacitacion.objects.all()
    serializer_class = ParticipanteCapacitacionSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('recursos_humanos', 'supervisor', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_empleado = self.request.query_params.get('fo_empleado')
        if fo_empleado:
            queryset = queryset.filter(fo_empleado=fo_empleado)
        return queryset

    def perform_create(self, serializer):
        instancia = serializer.save()
        notificar(
            usuario=instancia.fo_empleado.fo_usuario,
            mensaje_interno=f'Fuiste inscrito en la capacitación: {instancia.fo_capacitacion.fo_curso.titulo}',
            asunto_correo='Nueva capacitación asignada - TRAINET',
            cuerpo_correo=f'Hola, has sido inscrito en la capacitación "{instancia.fo_capacitacion.fo_curso.titulo}", que inicia el {instancia.fo_capacitacion.fecha_inicio}.'
        )


class EvidenciaParticipacionViewSet(viewsets.ModelViewSet):
    queryset = EvidenciaParticipacion.objects.all()
    serializer_class = EvidenciaParticipacionSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('recursos_humanos', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class ProgresoCursoViewSet(viewsets.ModelViewSet):
    queryset = ProgresoCurso.objects.all()
    serializer_class = ProgresoCursoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles('capacitador', 'encargado_formacion', 'administrador')]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
