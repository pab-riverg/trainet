"""Capacitación: cursos, capacitaciones y materiales; las listas son iguales para todos los roles."""
from capacitacion.models import Capacitacion, Curso, MaterialEducativo
from notificaciones.rutas import (
    VISTA_CAPACITACION_CAPACITACIONES, VISTA_CAPACITACION_CURSOS, VISTA_CAPACITACION_MATERIALES)

from ..estructuras import Resultado


def buscar(usuario, texto, limite):
    cursos = (Curso.objects.filter(titulo__icontains=texto).order_by('titulo', 'id')
              .select_related('fo_categoria_curso')
              .only('titulo', 'estado', 'fo_categoria_curso__nombre_categoria')[:limite])
    resultados = [Resultado(c.titulo, c.fo_categoria_curso.nombre_categoria, c.estado, VISTA_CAPACITACION_CURSOS)
                  for c in cursos]
    if len(resultados) < limite:
        capacitaciones = (Capacitacion.objects.filter(fo_curso__titulo__icontains=texto)
                          .order_by('-fecha_inicio', '-id').select_related('fo_curso')
                          .only('modalidad', 'fecha_inicio', 'fo_curso__titulo')[:limite - len(resultados)])
        resultados += [Resultado(c.fo_curso.titulo, f'Capacitación {c.modalidad} · {c.fecha_inicio:%d/%m/%Y}', '',
                                 VISTA_CAPACITACION_CAPACITACIONES) for c in capacitaciones]
    if len(resultados) < limite:
        materiales = (MaterialEducativo.objects.filter(titulo__icontains=texto).order_by('titulo', 'id')
                      .select_related('fo_curso').only('titulo', 'fo_curso__titulo')[:limite - len(resultados)])
        resultados += [Resultado(m.titulo, f'Material de {m.fo_curso.titulo}', '', VISTA_CAPACITACION_MATERIALES)
                       for m in materiales]
    return resultados
