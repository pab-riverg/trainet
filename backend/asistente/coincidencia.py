"""Coincidencia de preguntas con las consultas entrenadas. Sin IA: normalización + tokens + difflib."""
import re
import unicodedata
from difflib import SequenceMatcher

# Puntaje desde el cual la mejor consulta se responde directamente.
UMBRAL_ALTO = 0.6
# Puntaje mínimo para ofrecer una consulta como sugerencia cuando no hay respuesta directa.
UMBRAL_BAJO = 0.3
MAX_SUGERENCIAS = 3
MAX_LONGITUD_TEXTO = 300
MIN_LONGITUD_TOKEN = 3
# Pesos del puntaje: cobertura de tokens (más fiable) y similitud de la frase completa.
PESO_TOKENS = 0.7
PESO_SIMILITUD = 0.3
# Un token con esta similitud o más se considera el mismo (tolera erratas leves).
UMBRAL_TOKEN_SIMILAR = 0.82

PALABRAS_VACIAS = frozenset(
    'el la los las un una unos unas de del al y o u e en a con por para que como cual cuales '
    'se su sus mi mis tu tus me te lo le les es son soy eres ser esta este esto estos estas '
    'hay hacer puedo puede pueden quiero necesito donde cuando mas muy ya no si sin sobre '
    'tengo tiene tienen'.split()
)


def normalizar(texto):
    """Minúsculas, sin tildes, solo letras y números separados por un espacio."""
    texto = unicodedata.normalize('NFD', (texto or '').lower())
    texto = ''.join(c for c in texto if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9]+', ' ', texto).strip()


def tokens(texto):
    return [t for t in normalizar(texto).split()
            if len(t) >= MIN_LONGITUD_TOKEN and t not in PALABRAS_VACIAS]


def limpiar_texto(texto):
    """Recorta espacios y limita a 300 caracteres. Devuelve '' si no queda nada."""
    return (texto or '').strip()[:MAX_LONGITUD_TEXTO].strip()


def _token_presente(token, candidatos):
    if token in candidatos:
        return True
    return any(SequenceMatcher(None, token, c).ratio() >= UMBRAL_TOKEN_SIMILAR for c in candidatos)


def puntaje(texto_usuario, consulta):
    toks_usuario = tokens(texto_usuario)
    norm_usuario = normalizar(texto_usuario)
    if not toks_usuario or not norm_usuario:
        return 0.0
    candidatos = set(tokens(consulta.pregunta)) | set(tokens(consulta.palabras_clave))
    cobertura = sum(1 for t in toks_usuario if _token_presente(t, candidatos)) / len(toks_usuario)
    similitud = SequenceMatcher(None, norm_usuario, normalizar(consulta.pregunta)).ratio()
    return round(PESO_TOKENS * cobertura + PESO_SIMILITUD * similitud, 3)


def buscar(texto, consultas):
    """Devuelve (mejor, sugerencias, puntajes).

    mejor: consulta con puntaje >= UMBRAL_ALTO, o None.
    sugerencias: hasta 3 consultas con puntaje >= UMBRAL_BAJO (vacía si hubo mejor).
    puntajes: lista [(consulta, puntaje)] ordenada, útil para depurar.
    """
    texto = limpiar_texto(texto)
    puntuadas = sorted(((c, puntaje(texto, c)) for c in consultas), key=lambda par: -par[1])
    if puntuadas and puntuadas[0][1] >= UMBRAL_ALTO:
        return puntuadas[0][0], [], puntuadas
    sugerencias = [c for c, p in puntuadas if p >= UMBRAL_BAJO][:MAX_SUGERENCIAS]
    return None, sugerencias, puntuadas
