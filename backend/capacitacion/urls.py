from rest_framework.routers import DefaultRouter

from .views import (
    CapacitacionViewSet,
    CursoViewSet,
    EvidenciaParticipacionViewSet,
    MaterialEducativoViewSet,
    ParticipanteCapacitacionViewSet,
    ProgresoCursoViewSet,
)

router = DefaultRouter()
router.register('cursos', CursoViewSet, basename='curso')
router.register('capacitaciones', CapacitacionViewSet, basename='capacitacion')
router.register('materiales-educativos', MaterialEducativoViewSet, basename='material-educativo')
router.register('participantes-capacitacion', ParticipanteCapacitacionViewSet, basename='participante-capacitacion')
router.register('evidencias-participacion', EvidenciaParticipacionViewSet, basename='evidencia-participacion')
router.register('progreso-cursos', ProgresoCursoViewSet, basename='progreso-curso')

urlpatterns = router.urls
