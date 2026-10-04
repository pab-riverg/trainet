"""Reportes: informes de los tipos permitidos al rol (filtrar_informes) y archivos importados dentro de su alcance
(filtrar_archivos: administrador y directivo todos; el resto, los propios). Se busca solo por título."""
from notificaciones.rutas import VISTA_REPORTES_ARCHIVOS, VISTA_REPORTES_HISTORIAL
from reportes.models import ArchivoImportado, Reporte
from reportes.permisos import ROLES_ARCHIVOS_REPORTES, filtrar_archivos, filtrar_informes

from ..estructuras import Resultado


def buscar(usuario, texto, limite):
    informes = (filtrar_informes(Reporte.objects.all(), usuario).filter(titulo__icontains=texto)
                .order_by('-fecha_generacion', '-id').select_related('fo_tipo_reporte')
                .only('titulo', 'fecha_generacion', 'fo_tipo_reporte__nombre_tipo')[:limite])
    resultados = [Resultado(i.titulo, f'Informe · {i.fo_tipo_reporte.nombre_tipo} · {i.fecha_generacion:%d/%m/%Y}', '',
                            VISTA_REPORTES_HISTORIAL) for i in informes]
    if usuario.rol in ROLES_ARCHIVOS_REPORTES and len(resultados) < limite:
        # Como la lista de archivos: solo los activos.
        archivos = (filtrar_archivos(ArchivoImportado.objects.filter(activo=True), usuario)
                    .filter(titulo__icontains=texto).order_by('-fecha_documento', '-id').select_related('fo_tipo')
                    .only('titulo', 'formato', 'fo_tipo__nombre_tipo')[:limite - len(resultados)])
        resultados += [Resultado(a.titulo, f'Archivo {a.formato.upper()} · {a.fo_tipo.nombre_tipo}', '',
                                 VISTA_REPORTES_ARCHIVOS) for a in archivos]
    return resultados
