"""Exportadores del dict de contenido de un informe. Cada uno devuelve bytes, sin archivos temporales."""
from . import excel, pdf, word

# formato -> (función, content-type, extensión)
EXPORTADORES = {
    'pdf': (pdf.exportar, 'application/pdf', 'pdf'),
    'xlsx': (excel.exportar, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'),
    'docx': (word.exportar, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'),
}
