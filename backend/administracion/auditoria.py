"""Bitácora de auditoría: catálogo de acciones y helper para registrar eventos clave."""
import ipaddress
import logging
import re

from django.conf import settings
from django.db import transaction

from .models import LogAuditoria, ModuloAdministracion

logger = logging.getLogger(__name__)

# clave -> etiqueta en español
ACCIONES = {
    'login_ok': 'Inicio de sesión',
    'login_fallido': 'Inicio de sesión fallido',
    'usuario_creado': 'Usuario creado',
    'usuario_editado': 'Usuario editado',
    'usuario_eliminado': 'Usuario eliminado',
    'usuario_rol_cambiado': 'Rol de usuario cambiado',
    'configuracion_cambiada': 'Configuración cambiada',
    'archivo_importado': 'Archivo importado',
    'archivo_archivado': 'Archivo archivado',
    'archivo_restaurado': 'Archivo restaurado',
    'archivo_eliminado': 'Archivo eliminado',
    'informe_generado': 'Informe generado',
    'informe_consolidado': 'Informe consolidado',
    'informe_exportado': 'Informe exportado',
    'informe_eliminado': 'Informe eliminado',
}

# clave -> etiqueta del módulo de origen
MODULOS = {
    'autenticacion': 'Autenticación',
    'usuarios': 'Usuarios',
    'administracion': 'Administración',
    'reportes': 'Reportes',
}

MAX_DESCRIPCION = 255
_CONTROL = re.compile(r'[\x00-\x1f\x7f]')


def _limpiar(texto):
    return _CONTROL.sub(' ', str(texto)).strip()[:MAX_DESCRIPCION]


def obtener_ip(request):
    """IP del cliente. X-Forwarded-For solo si el proyecto declara TRUST_X_FORWARDED_FOR = True."""
    if request is None:
        return None
    direccion = request.META.get('REMOTE_ADDR')
    if getattr(settings, 'TRUST_X_FORWARDED_FOR', False):
        reenviada = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if reenviada:
            direccion = reenviada.split(',')[0].strip()
    try:
        return str(ipaddress.ip_address(direccion))
    except (ValueError, TypeError):
        return None


def registrar(usuario, accion, modulo, descripcion, request=None):
    """Registra un evento. NUNCA lanza: un fallo de auditoría no debe romper la operación principal.

    Llamar después de que la operación tuvo éxito. No incluir contraseñas, tokens ni datos sensibles en la descripción.
    """
    try:
        modulo_admin = ModuloAdministracion.objects.order_by('id').first()
        if modulo_admin is None:
            logger.error('Auditoría: no existe el módulo de administración; evento %s no registrado.', accion)
            return None
        autenticado = usuario is not None and getattr(usuario, 'is_authenticated', False) and getattr(usuario, 'pk', None)
        # Savepoint: si el INSERT falla no invalida una transacción externa.
        with transaction.atomic():
            return LogAuditoria.objects.create(
                descripcion=_limpiar(descripcion),
                accion=accion[:40],
                modulo=modulo[:30],
                ip=obtener_ip(request),
                fo_usuario=usuario if autenticado else None,
                fo_mod_admin=modulo_admin,
            )
    except Exception:
        logger.exception('Auditoría: no se pudo registrar el evento %s.', accion)
        return None
