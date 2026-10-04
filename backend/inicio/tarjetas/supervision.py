"""Tarjetas de supervisión y aprobación: ven datos de otras personas porque su rol lo exige."""
from compras.models import SolicitudCompra
from recursos.models import SolicitudRecursos
from usuarios.models import Empleado, Supervisor

from ..estructuras import metrica, tarjeta_metricas


def pendientes_equipo(usuario):
    """Solicitudes pendientes de los empleados cuyo supervisor es el usuario."""
    supervisor = Supervisor.objects.filter(fo_usuario=usuario).first()
    if supervisor is None:
        return None
    equipo = list(Empleado.objects.filter(fo_supervisor=supervisor).values_list('fo_usuario_id', flat=True))
    return tarjeta_metricas('pendientes_equipo', 'Pendientes de mi equipo', [
        metrica('Empleados a cargo', len(equipo)),
        metrica('Compras pendientes', SolicitudCompra.objects.filter(fo_solicitante_id__in=equipo, estado='pendiente').count(), '/compras'),
        metrica('Recursos pendientes', SolicitudRecursos.objects.filter(fo_usuario_id__in=equipo, estado='pendiente').count(), '/recursos'),
    ])


def solicitudes_por_aprobar(usuario):
    """Solicitudes de compra y de recursos que esperan decisión."""
    return tarjeta_metricas('solicitudes_por_aprobar', 'Solicitudes por aprobar', [
        metrica('Compras pendientes', SolicitudCompra.objects.filter(estado='pendiente').count(), '/compras'),
        metrica('Recursos pendientes', SolicitudRecursos.objects.filter(estado='pendiente').count(), '/recursos'),
    ])
