"""Configuración del sistema (tabla configuracion_sistema) con lista blanca de claves editables."""
import re

from django.db import transaction

from .models import ConfiguracionSistema, ModuloAdministracion

NOMBRE_EQUIPO_POR_DEFECTO = 'Nombre de Equipo de Trabajo'
MAX_NOMBRE_EQUIPO = 60

_CONTROL = re.compile(r'[\x00-\x1f\x7f]')


class ErrorConfiguracion(Exception):
    """Valor no válido; `campo` y `mensaje` se devuelven al cliente como error por campo."""

    def __init__(self, campo, mensaje):
        super().__init__(mensaje)
        self.campo = campo
        self.mensaje = mensaje


def limpiar_texto(valor):
    """Quita caracteres de control, recorta y colapsa espacios repetidos."""
    return ' '.join(_CONTROL.sub(' ', str(valor)).split())


def _validar_nombre_equipo(valor):
    if not isinstance(valor, str):
        raise ErrorConfiguracion('nombre_equipo', 'El nombre del equipo debe ser un texto.')
    limpio = limpiar_texto(valor)
    if not limpio:
        raise ErrorConfiguracion('nombre_equipo', 'El nombre del equipo es obligatorio.')
    if len(limpio) > MAX_NOMBRE_EQUIPO:
        raise ErrorConfiguracion('nombre_equipo', f'El nombre del equipo no puede superar {MAX_NOMBRE_EQUIPO} caracteres.')
    return limpio


# Lista blanca: solo estas claves se pueden editar por la API. Para añadir otra, agregarla aquí.
CLAVES_EDITABLES = {
    'nombre_equipo': {'defecto': NOMBRE_EQUIPO_POR_DEFECTO, 'validar': _validar_nombre_equipo},
}


def obtener(clave):
    """Valor guardado de una clave de la lista blanca, o su valor por defecto."""
    fila = ConfiguracionSistema.objects.filter(clave=clave).first()
    return fila.valor if fila else CLAVES_EDITABLES[clave]['defecto']


def configuracion_publica():
    return {clave: obtener(clave) for clave in CLAVES_EDITABLES}


def sembrar_por_defecto():
    """Crea las claves que falten SIN sobrescribir valores existentes. Devuelve [(clave, creada)]."""
    modulo = ModuloAdministracion.objects.order_by('id').first()
    resultado = []
    for clave, datos in CLAVES_EDITABLES.items():
        _, creada = ConfiguracionSistema.objects.get_or_create(
            clave=clave, defaults={'valor': datos['defecto'], 'fo_mod_admin': modulo})
        resultado.append((clave, creada))
    return resultado


def actualizar(cambios):
    """Valida y guarda los cambios. Devuelve [(clave, anterior, nuevo)] solo de lo que cambió."""
    desconocidas = [clave for clave in cambios if clave not in CLAVES_EDITABLES]
    if desconocidas:
        raise ErrorConfiguracion(desconocidas[0], 'Este ajuste no se puede modificar.')
    validados = {clave: CLAVES_EDITABLES[clave]['validar'](valor) for clave, valor in cambios.items()}

    modulo = ModuloAdministracion.objects.order_by('id').first()
    cambiados = []
    with transaction.atomic():
        for clave, nuevo in validados.items():
            anterior = obtener(clave)
            if anterior != nuevo:
                ConfiguracionSistema.objects.update_or_create(
                    clave=clave, defaults={'valor': nuevo, 'fo_mod_admin': modulo})
                cambiados.append((clave, anterior, nuevo))
    return cambiados
