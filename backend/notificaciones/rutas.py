"""Destinos de las notificaciones: única fuente de verdad de rutas, pestañas (?vista=) y patrones de mensajes antiguos.

La ruta es SIEMPRE interna y apunta a la lista o pestaña de un módulo, nunca al detalle de un elemento (sin ids).
"""
import logging
import re

logger = logging.getLogger(__name__)

# --- Módulos destino (ruta del frontend) ---
RUTA_COMPRAS = '/compras'
RUTA_RECURSOS = '/recursos'
RUTA_SOPORTE = '/soporte'
RUTA_CAPACITACION = '/capacitacion'
RUTA_PROVEEDORES = '/proveedores'

# --- Claves de pestaña (?vista=), iguales a los `id` de las pestañas de cada módulo en el frontend ---
VISTA_COMPRAS_MIS_SOLICITUDES = 'mis-solicitudes'
VISTA_COMPRAS_SOLICITUDES = 'solicitudes'
VISTA_COMPRAS_TIENDA = 'tienda'
VISTA_COMPRAS_CATALOGO = 'catalogo'
VISTA_RECURSOS_MIS_PEDIDOS = 'mis-pedidos'
VISTA_RECURSOS_GESTION = 'gestion'
VISTA_RECURSOS_CATALOGO = 'catalogo'
VISTA_SOPORTE_MIS_TICKETS = 'reportar'
VISTA_SOPORTE_GESTION = 'gestion'
VISTA_CAPACITACION_CURSOS = 'cursos'
VISTA_CAPACITACION_CAPACITACIONES = 'capacitaciones'
VISTA_CAPACITACION_MATERIALES = 'materiales'
VISTA_CAPACITACION_INSCRIPCIONES = 'inscripciones'
VISTA_REPORTES_ARCHIVOS = 'archivos'
VISTA_REPORTES_HISTORIAL = 'historial'
VISTA_PROVEEDORES_DIRECTORIO = 'directorio'
VISTA_PROVEEDORES_NECESIDADES = 'necesidades'
VISTA_PROVEEDORES_ACUERDOS = 'acuerdos'

# --- Eventos que notifican ---
COMPRA_NUEVA = 'compra_nueva'
COMPRA_OBSERVACION = 'compra_observacion'
COMPRA_DECISION = 'compra_decision'
COMPRA_COMPRADA = 'compra_comprada'
COMPRA_ENTREGADA = 'compra_entregada'
COMPRA_RECIBIDA = 'compra_recibida'
COMPRA_RECLAMO = 'compra_reclamo'
ORDEN_COMPRA_ENTREGADA = 'orden_compra_entregada'
RECURSO_NUEVO = 'recurso_nuevo'
RECURSO_DISPONIBILIDAD = 'recurso_disponibilidad'
RECURSO_DECISION = 'recurso_decision'
RECURSO_ENTREGADO = 'recurso_entregado'
TICKET_ASIGNADO = 'ticket_asignado'
TICKET_ESTADO = 'ticket_estado'
CAPACITACION_INSCRITO = 'capacitacion_inscrito'
NECESIDAD_NUEVA = 'necesidad_nueva'
COTIZACION_APROBADA = 'cotizacion_aprobada'
ACUERDO_PENDIENTE = 'acuerdo_pendiente'
ACUERDO_DECISION = 'acuerdo_decision'
# Avisos de cuenta: no tienen un módulo al que llevar (ruta vacía a propósito).
CUENTA_CREADA = 'cuenta_creada'
PASSWORD_RECUPERADA = 'password_recuperada'

# evento -> (módulo, vista) o None si no hay destino. `vista` puede ser un texto, None (se abre el módulo sin
# pestaña) o un dict {rol: vista, '*': por defecto} cuando el destinatario puede ser de roles con pestañas distintas.
DESTINOS = {
    COMPRA_NUEVA: (RUTA_COMPRAS, VISTA_COMPRAS_SOLICITUDES),
    COMPRA_OBSERVACION: (RUTA_COMPRAS, VISTA_COMPRAS_SOLICITUDES),
    COMPRA_DECISION: (RUTA_COMPRAS, VISTA_COMPRAS_MIS_SOLICITUDES),
    # Avisa al encargado administrativo (ve todas) y al solicitante (ve las suyas).
    COMPRA_COMPRADA: (RUTA_COMPRAS, {'encargado_administrativo': VISTA_COMPRAS_SOLICITUDES,
                                     '*': VISTA_COMPRAS_MIS_SOLICITUDES}),
    COMPRA_ENTREGADA: (RUTA_COMPRAS, VISTA_COMPRAS_MIS_SOLICITUDES),
    COMPRA_RECIBIDA: (RUTA_COMPRAS, VISTA_COMPRAS_SOLICITUDES),
    COMPRA_RECLAMO: (RUTA_COMPRAS, VISTA_COMPRAS_SOLICITUDES),
    ORDEN_COMPRA_ENTREGADA: (RUTA_COMPRAS, None),
    RECURSO_NUEVO: (RUTA_RECURSOS, VISTA_RECURSOS_GESTION),
    RECURSO_DISPONIBILIDAD: (RUTA_RECURSOS, VISTA_RECURSOS_MIS_PEDIDOS),
    RECURSO_DECISION: (RUTA_RECURSOS, VISTA_RECURSOS_MIS_PEDIDOS),
    RECURSO_ENTREGADO: (RUTA_RECURSOS, VISTA_RECURSOS_MIS_PEDIDOS),
    TICKET_ASIGNADO: (RUTA_SOPORTE, VISTA_SOPORTE_GESTION),
    TICKET_ESTADO: (RUTA_SOPORTE, VISTA_SOPORTE_MIS_TICKETS),
    CAPACITACION_INSCRITO: (RUTA_CAPACITACION, VISTA_CAPACITACION_INSCRIPCIONES),
    NECESIDAD_NUEVA: (RUTA_PROVEEDORES, VISTA_PROVEEDORES_NECESIDADES),
    # Las cotizaciones se consultan desde el directorio (pestaña por defecto).
    COTIZACION_APROBADA: (RUTA_PROVEEDORES, None),
    ACUERDO_PENDIENTE: (RUTA_PROVEEDORES, VISTA_PROVEEDORES_ACUERDOS),
    ACUERDO_DECISION: (RUTA_PROVEEDORES, VISTA_PROVEEDORES_ACUERDOS),
    CUENTA_CREADA: None,
    PASSWORD_RECUPERADA: None,
}

# Patrones de los mensajes ya guardados (notificaciones antiguas) -> evento. El orden importa: gana el primero.
PATRONES_MENSAJE = (
    (r'^Nueva solicitud de compra #', COMPRA_NUEVA),
    (r'dejó una observación en la solicitud de compra', COMPRA_OBSERVACION),
    (r'^Tu solicitud de compra #\d+ fue (aprobada|rechazada)', COMPRA_DECISION),
    (r'^La solicitud de compra #\d+ fue comprada', COMPRA_COMPRADA),
    (r'^Tu solicitud de compra #\d+ fue entregada|^Tu reclamo sobre la solicitud', COMPRA_ENTREGADA),
    (r'confirmó la recepción de la solicitud de compra', COMPRA_RECIBIDA),
    (r'reporta que NO recibió la solicitud de compra', COMPRA_RECLAMO),
    (r'^Tu orden de compra ".*" fue entregada', ORDEN_COMPRA_ENTREGADA),
    (r'^Nueva solicitud de recursos', RECURSO_NUEVO),
    (r'^El recurso ".*" de tu solicitud', RECURSO_DISPONIBILIDAD),
    (r'^Tu solicitud de recursos #\d+ fue (aprobada|rechazada)', RECURSO_DECISION),
    (r'^Tu solicitud de recursos #\d+ fue entregada', RECURSO_ENTREGADO),
    (r'^Se te asignó el ticket', TICKET_ASIGNADO),
    (r'^Tu ticket #\d+ cambió a', TICKET_ESTADO),
    (r'^Fuiste inscrito en la capacitación', CAPACITACION_INSCRITO),
    (r'^Nueva necesidad de capacitación externa', NECESIDAD_NUEVA),
    (r'^La cotización #\d+ de .* fue aprobada', COTIZACION_APROBADA),
    (r'^Acuerdo #\d+ con .* pendiente de aprobación', ACUERDO_PENDIENTE),
    (r'^Tu acuerdo #\d+ con .* fue (aprobado|rechazado)', ACUERDO_DECISION),
    # Mensaje de una versión anterior de Proveedores.
    (r'^Se formalizó el acuerdo', ACUERDO_DECISION),
    (r'^Se creó tu cuenta en TRAINET', CUENTA_CREADA),
    (r'^Se generó una nueva contraseña temporal', PASSWORD_RECUPERADA),
)
_PATRONES_COMPILADOS = tuple((re.compile(patron), evento) for patron, evento in PATRONES_MENSAJE)

# Una sola ruta de módulo, con a lo sumo ?vista=<clave>: nada de ids, esquemas ni '//'.
_RUTA_PERMITIDA = re.compile(r'^/[a-z0-9_-]+(\?vista=[a-z0-9_-]+)?$')
MAX_RUTA = 120


def ruta_de_evento(evento, rol):
    """Ruta (con ?vista= si corresponde) que lleva al destinatario de ese rol a donde está lo notificado."""
    destino = DESTINOS[evento]
    if destino is None:
        return ''
    modulo, vista = destino
    if isinstance(vista, dict):
        vista = vista.get(rol, vista['*'])
    return f'{modulo}?vista={vista}' if vista else modulo


def evento_de_mensaje(mensaje):
    """Evento al que corresponde un mensaje antiguo, o None si no se reconoce."""
    for patron, evento in _PATRONES_COMPILADOS:
        if patron.search(mensaje):
            return evento
    return None


def ruta_valida(ruta, usuario):
    """Devuelve la ruta si es segura y el rol del destinatario tiene acceso al módulo; si no, '' con un warning."""
    if not ruta:
        return ''
    # Importación diferida: el registro de módulos importa muchos permisos.py.
    from inicio.modulos import MODULOS
    if isinstance(ruta, str) and len(ruta) <= MAX_RUTA and _RUTA_PERMITIDA.match(ruta):
        modulo = '/' + ruta[1:].split('?')[0]
        if any(m.ruta == modulo and usuario.rol in m.roles for m in MODULOS):
            return ruta
    logger.warning('Ruta de notificación descartada (%r) para el usuario %s (rol %s).',
                   ruta, getattr(usuario, 'pk', None), getattr(usuario, 'rol', None))
    return ''
