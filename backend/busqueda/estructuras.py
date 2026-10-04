"""Estructuras del buscador global (GET /api/buscar/).

Contrato de la respuesta:
    {"q": "...", "total": N,
     "grupos": [{"modulo": <clave del registro>, "titulo": "...", "icono": "bi-...", "ruta": "/modulo",
                 "resultados": [{"titulo": "...", "subtitulo": "...", "estado": "..."?, "ruta": "/modulo?vista=...&q=..."}]}]}

Interfaz de cada buscador (busqueda/buscadores/<modulo>.py):
    buscar(usuario, texto, limite) -> list[Resultado]
Debe aplicar EXACTAMENTE el alcance de la lista real del módulo para ese usuario (reutilizando su función de
queryset), devolver como mucho `limite` resultados y no tocar campos sensibles (cédula, teléfono, NIT, etc.).
Un buscador nunca arma rutas: indica la `vista` (pestaña) y la vista construye la ruta, siempre a una lista.
"""
from dataclasses import dataclass
from typing import Optional

# Tope por módulo y total de la respuesta.
MAX_POR_MODULO = 5
MAX_TOTAL = 30


@dataclass(frozen=True)
class Resultado:
    titulo: str
    subtitulo: str = ''
    estado: str = ''
    # Clave de la pestaña del módulo (?vista=); None = el módulo no tiene pestañas.
    vista: Optional[str] = None


def recortar(texto, largo=80):
    """Texto en una línea y acotado, para títulos y subtítulos."""
    texto = ' '.join(str(texto or '').split())
    return texto if len(texto) <= largo else texto[:largo - 1].rstrip() + '…'
