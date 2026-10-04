"""Registro ordenado de tarjetas de Inicio. El orden de TARJETAS es el orden de la respuesta (fijo y estable)."""
from dataclasses import dataclass
from typing import Callable, Optional

from ..modulos import rol_ve_modulo
from . import administracion, formacion, personal, soporte, supervision


@dataclass(frozen=True)
class Tarjeta:
    clave: str
    modulo: str                       # módulo de origen: el rol debe poder verlo
    construir: Callable               # f(usuario) -> dict de tarjeta, o None si no hay datos que mostrar
    roles: Optional[tuple] = None     # None = todos los roles


TARJETAS = (
    Tarjeta('acceso_triny', 'triny', personal.acceso_triny),
    Tarjeta('mis_tickets', 'soporte', personal.mis_tickets),
    Tarjeta('mi_capacitacion', 'capacitacion', personal.mi_capacitacion, ('empleado',)),
    Tarjeta('mis_pedidos', 'compras', personal.mis_pedidos, ('empleado', 'supervisor')),
    Tarjeta('pendientes_equipo', 'compras', supervision.pendientes_equipo, ('supervisor',)),
    Tarjeta('solicitudes_por_aprobar', 'compras', supervision.solicitudes_por_aprobar, ('encargado_administrativo', 'directivo', 'administrador')),
    Tarjeta('tickets_sin_atender', 'soporte', soporte.tickets_sin_atender, ('tecnico_soporte', 'administrador')),
    Tarjeta('tickets_estado', 'soporte', soporte.tickets_estado, ('tecnico_soporte', 'administrador')),
    Tarjeta('cursos_y_aprendices', 'capacitacion', formacion.cursos_y_aprendices, ('capacitador', 'encargado_formacion')),
    Tarjeta('documentos_recientes', 'documentos', formacion.documentos_recientes, ('encargado_documental',)),
    Tarjeta('personal_capacitacion', 'capacitacion', formacion.personal_y_capacitacion, ('recursos_humanos',)),
    Tarjeta('actividad_reciente', 'administrador', administracion.actividad_reciente, ('administrador',)),
    Tarjeta('resumen_indicadores', 'reportes', administracion.resumen_indicadores, ('directivo', 'administrador')),
)


def tarjetas_para(rol):
    """Tarjetas que corresponden al rol (por rol y por acceso al módulo de origen)."""
    return [t for t in TARJETAS if (t.roles is None or rol in t.roles) and rol_ve_modulo(rol, t.modulo)]


def construir_tarjetas(usuario):
    """Construye las tarjetas del usuario. Una tarjeta sin datos (None) se omite sin afectar al resto."""
    construidas = (t.construir(usuario) for t in tarjetas_para(usuario.rol))
    return [tarjeta for tarjeta in construidas if tarjeta is not None]
