from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from notificaciones.utils import notificar
from notificaciones.rutas import CAPACITACION_INSCRITO, ruta_de_evento
from usuarios.permissions import permiso_por_roles

from .models import (
    Capacitacion,
    CategoriaCurso,
    Curso,
    EvidenciaParticipacion,
    MaterialEducativo,
    ModuloCapacitacion,
    ParticipanteCapacitacion,
    ProgresoCurso,
)
from .serializers import (
    CapacitacionSerializer,
    CategoriaCursoSerializer,
    CursoSerializer,
    EvidenciaParticipacionSerializer,
    MaterialEducativoSerializer,
    ModuloCapacitacionSerializer,
    ParticipanteCapacitacionSerializer,
    ProgresoCursoSerializer,
)

# Roles con permiso de escritura (create/update/partial_update/destroy) por recurso.
# Deben mantenerse iguales a frontend/src/app/modelos/permisos-capacitacion.ts
ROLES_GESTION_CURSOS = ('capacitador', 'encargado_formacion', 'administrador')
ROLES_GESTION_CAPACITACIONES = ('recursos_humanos', 'capacitador', 'encargado_formacion', 'administrador')
ROLES_GESTION_PARTICIPANTES = ('recursos_humanos', 'supervisor', 'capacitador', 'encargado_formacion', 'administrador')
ROLES_GESTION_EVIDENCIAS = ('recursos_humanos', 'capacitador', 'encargado_formacion', 'administrador')


class ModuloCapacitacionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ModuloCapacitacion.objects.all()
    serializer_class = ModuloCapacitacionSerializer
    permission_classes = [IsAuthenticated]


class CategoriaCursoViewSet(viewsets.ModelViewSet):
    queryset = CategoriaCurso.objects.all()
    serializer_class = CategoriaCursoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles(*ROLES_GESTION_CURSOS)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class CursoViewSet(viewsets.ModelViewSet):
    queryset = Curso.objects.all()
    serializer_class = CursoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles(*ROLES_GESTION_CURSOS)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_mod_cap = self.request.query_params.get('fo_mod_cap')
        if fo_mod_cap:
            queryset = queryset.filter(fo_mod_cap=fo_mod_cap)
        return queryset


class CapacitacionViewSet(viewsets.ModelViewSet):
    queryset = Capacitacion.objects.select_related('fo_curso', 'fo_instructor__fo_usuario')
    serializer_class = CapacitacionSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles(*ROLES_GESTION_CAPACITACIONES)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_curso = self.request.query_params.get('fo_curso')
        if fo_curso:
            queryset = queryset.filter(fo_curso=fo_curso)
        return queryset


class MaterialEducativoViewSet(viewsets.ModelViewSet):
    queryset = MaterialEducativo.objects.all()
    serializer_class = MaterialEducativoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles(*ROLES_GESTION_CURSOS)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_curso = self.request.query_params.get('fo_curso')
        if fo_curso:
            queryset = queryset.filter(fo_curso=fo_curso)
        return queryset


class ParticipanteCapacitacionViewSet(viewsets.ModelViewSet):
    queryset = ParticipanteCapacitacion.objects.select_related(
        'fo_empleado__fo_usuario', 'fo_capacitacion__fo_curso'
    )
    serializer_class = ParticipanteCapacitacionSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles(*ROLES_GESTION_PARTICIPANTES)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_empleado = self.request.query_params.get('fo_empleado')
        if fo_empleado:
            queryset = queryset.filter(fo_empleado=fo_empleado)
        fo_capacitacion = self.request.query_params.get('fo_capacitacion')
        if fo_capacitacion:
            queryset = queryset.filter(fo_capacitacion=fo_capacitacion)
        return queryset

    def perform_create(self, serializer):
        instancia = serializer.save()
        notificar(
            usuario=instancia.fo_empleado.fo_usuario,
            mensaje_interno=f'Fuiste inscrito en la capacitación: {instancia.fo_capacitacion.fo_curso.titulo}',
            asunto_correo='Nueva capacitación asignada - TRAINET',
            cuerpo_correo=f'Hola, has sido inscrito en la capacitación "{instancia.fo_capacitacion.fo_curso.titulo}", que inicia el {instancia.fo_capacitacion.fecha_inicio}.',
            ruta=ruta_de_evento(CAPACITACION_INSCRITO, instancia.fo_empleado.fo_usuario.rol)
        )


class EvidenciaParticipacionViewSet(viewsets.ModelViewSet):
    queryset = EvidenciaParticipacion.objects.all()
    serializer_class = EvidenciaParticipacionSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles(*ROLES_GESTION_EVIDENCIAS)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_participante = self.request.query_params.get('fo_participante')
        if fo_participante:
            queryset = queryset.filter(fo_participante=fo_participante)
        return queryset


class ProgresoCursoViewSet(viewsets.ModelViewSet):
    queryset = ProgresoCurso.objects.select_related('fo_curso')
    serializer_class = ProgresoCursoSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            permission_classes = [IsAuthenticated, permiso_por_roles(*ROLES_GESTION_CURSOS)]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        fo_empleado = self.request.query_params.get('fo_empleado')
        if fo_empleado:
            queryset = queryset.filter(fo_empleado=fo_empleado)
        return queryset
