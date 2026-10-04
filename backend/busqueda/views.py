from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from inicio.modulos import modulos_visibles

from .buscadores.paginas import claves_que_coinciden
from .estructuras import MAX_POR_MODULO, MAX_TOTAL
from .registro import BUSCADORES
from .rutas import ruta_resultado

MIN_CARACTERES = 2
MAX_CARACTERES = 60
MAX_PAGINAS = 5


def _resultado(modulo, texto, r):
    datos = {'titulo': r.titulo, 'subtitulo': r.subtitulo, 'ruta': ruta_resultado(modulo['ruta'], r.vista, texto)}
    if r.estado:
        datos['estado'] = r.estado
    return datos


class BuscarView(APIView):
    """GET /api/buscar/?q=<texto>: resultados agrupados por módulo, solo de los módulos visibles para el rol.

    Solo lectura. Los resultados llevan a la lista o pestaña del módulo (nunca a un detalle). Contrato en
    busqueda/estructuras.py. Limitado por usuario (scope 'busqueda' en settings).
    """

    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'busqueda'

    def get(self, request):
        texto = (request.query_params.get('q') or '').strip()
        if len(texto) > MAX_CARACTERES:
            raise ValidationError({'q': f'La búsqueda admite como máximo {MAX_CARACTERES} caracteres.'})
        if len(texto) < MIN_CARACTERES:
            return Response({'q': texto, 'total': 0, 'grupos': []})

        usuario = request.user
        visibles = modulos_visibles(usuario.rol)
        grupos, total = [], 0

        # Páginas: los módulos visibles que coinciden por título o palabras clave.
        claves = claves_que_coinciden(visibles, texto)[:MAX_PAGINAS]
        if claves:
            paginas = [m for m in visibles if m['clave'] in claves]
            resultados = [{'titulo': m['titulo'], 'subtitulo': 'Ir a la página', 'ruta': m['ruta']} for m in paginas]
            grupos.append({'modulo': 'paginas', 'titulo': 'Páginas', 'icono': 'bi-compass', 'ruta': '',
                           'resultados': resultados})
            total += len(resultados)

        for modulo in visibles:
            buscador = BUSCADORES.get(modulo['clave'])
            if buscador is None or total >= MAX_TOTAL:
                continue
            limite = min(MAX_POR_MODULO, MAX_TOTAL - total)
            encontrados = buscador(usuario, texto, limite)[:limite]
            if encontrados:
                grupos.append({'modulo': modulo['clave'], 'titulo': modulo['titulo'], 'icono': modulo['icono'],
                               'ruta': modulo['ruta'],
                               'resultados': [_resultado(modulo, texto, r) for r in encontrados]})
                total += len(encontrados)

        return Response({'q': texto, 'total': total, 'grupos': grupos})
