import json
import os

from rest_framework import serializers

from . import importacion
from .permisos import ve_todos_los_archivos
from .models import (
    ArchivoImportado,
    DatoReporte,
    FrecuenciaReporte,
    ModuloReportes,
    ParametroReporte,
    Reporte,
    TipoReporte,
)


class ModuloReportesSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuloReportes
        fields = '__all__'


class TipoReporteSerializer(serializers.ModelSerializer):
    # False en el consolidado: se genera desde archivos, no por rango de fechas.
    requiere_fechas = serializers.SerializerMethodField()

    class Meta:
        model = TipoReporte
        fields = ['id', 'nombre_tipo', 'origen', 'clave', 'requiere_fechas', 'fo_mod_reportes']

    def get_requiere_fechas(self, tipo):
        return tipo.origen == 'sistema' and tipo.clave != 'consolidado'


class FrecuenciaReporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FrecuenciaReporte
        fields = '__all__'


class ReporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reporte
        fields = '__all__'
        read_only_fields = ['fo_usuario']


class DatoReporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatoReporte
        fields = '__all__'


class ParametroReporteSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametroReporte
        fields = '__all__'


class ArchivoImportadoSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.CharField(source='fo_tipo.nombre_tipo', read_only=True)
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True)
    archivo_nombre = serializers.SerializerMethodField()
    encabezados = serializers.SerializerMethodField()

    class Meta:
        model = ArchivoImportado
        fields = ['id', 'titulo', 'descripcion', 'archivo', 'archivo_nombre', 'formato', 'fo_tipo', 'tipo_nombre',
                  'fecha_documento', 'fecha_importacion', 'filas', 'columnas', 'encabezados', 'activo',
                  'fo_usuario', 'usuario_nombre', 'fo_mod_reportes']
        read_only_fields = ['formato', 'fecha_importacion', 'filas', 'columnas', 'activo', 'fo_usuario', 'fo_mod_reportes']
        extra_kwargs = {
            'titulo': {'error_messages': {'blank': 'El título es obligatorio.', 'required': 'El título es obligatorio.',
                                          'null': 'El título es obligatorio.'}},
            'fo_tipo': {'error_messages': {'required': 'Elige el tipo de archivo.', 'null': 'Elige el tipo de archivo.',
                                           'does_not_exist': 'El tipo de archivo no existe.',
                                           'incorrect_type': 'El tipo de archivo no es válido.'}},
            'fecha_documento': {'error_messages': {'invalid': 'Usa el formato AAAA-MM-DD.'}},
            'archivo': {'error_messages': {'required': 'Selecciona un archivo.', 'empty': 'El archivo está vacío.',
                                           'invalid': 'Selecciona un archivo válido.', 'no_name': 'El archivo no tiene nombre.'}},
        }

    def get_archivo_nombre(self, archivo_importado):
        return os.path.basename(archivo_importado.archivo.name) if archivo_importado.archivo else None

    def get_encabezados(self, archivo_importado):
        try:
            return json.loads(archivo_importado.encabezados)
        except ValueError:
            return []

    def validate_titulo(self, valor):
        valor = valor.strip()
        if not valor:
            raise serializers.ValidationError('El título es obligatorio.')
        return valor

    def validate_fo_tipo(self, tipo):
        if tipo.origen != 'archivo':
            raise serializers.ValidationError('Elige un tipo de archivo (Ventas, Asistencia, Inventario…).')
        return tipo

    def validate_archivo(self, archivo):
        if self.instance is not None:
            raise serializers.ValidationError('No se puede cambiar el archivo; importa uno nuevo.')
        contenido = archivo.read()
        archivo.seek(0)
        try:
            analisis = importacion.analizar(archivo.name, contenido)
        except importacion.ErrorImportacion as error:
            raise serializers.ValidationError(str(error))
        existente = ArchivoImportado.objects.filter(huella=analisis['huella']).first()
        if existente:
            # "Restáuralo desde Archivos" solo tiene sentido si el archivo está al alcance del usuario.
            solicitud = self.context.get('request')
            alcance_propio = solicitud is None or ve_todos_los_archivos(solicitud.user) or existente.fo_usuario_id == solicitud.user.pk
            if not existente.activo and alcance_propio:
                raise serializers.ValidationError(
                    'Este archivo ya fue importado y está archivado. Restáuralo desde Archivos.')
            raise serializers.ValidationError('Este archivo ya fue importado.')
        self._analisis = analisis
        return archivo

    def create(self, datos):
        instancia = ArchivoImportado(**datos, **self._analisis)
        try:
            instancia.save()
        except Exception:
            # Si falla al guardar la fila no debe quedar el archivo huérfano en disco.
            if instancia.archivo and instancia.archivo._committed:
                instancia.archivo.storage.delete(instancia.archivo.name)
            raise
        return instancia


class InformeListaSerializer(serializers.ModelSerializer):
    """Versión liviana: sin el contenido del informe."""
    tipo_nombre = serializers.CharField(source='fo_tipo_reporte.nombre_tipo', read_only=True)
    tipo_clave = serializers.CharField(source='fo_tipo_reporte.clave', read_only=True)
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True, default=None)
    parametros = serializers.SerializerMethodField()
    total_archivos = serializers.SerializerMethodField()

    class Meta:
        model = Reporte
        fields = ['id', 'titulo', 'fo_tipo_reporte', 'tipo_nombre', 'tipo_clave', 'fecha_generacion',
                  'fo_usuario', 'usuario_nombre', 'parametros', 'total_archivos']
        read_only_fields = fields

    def get_parametros(self, reporte):
        return _json_o_vacio(reporte.parametros)

    def get_total_archivos(self, reporte):
        # La vista anota total_archivos; si no, se cuenta.
        return getattr(reporte, 'total_archivos_anotado', None) if hasattr(reporte, 'total_archivos_anotado')             else reporte.archivos.count()


class InformeDetalleSerializer(InformeListaSerializer):
    contenido = serializers.SerializerMethodField()
    archivos = serializers.SerializerMethodField()

    class Meta(InformeListaSerializer.Meta):
        fields = InformeListaSerializer.Meta.fields + ['contenido', 'archivos']
        read_only_fields = fields

    def get_contenido(self, reporte):
        return _json_o_vacio(reporte.contenido)

    def get_archivos(self, reporte):
        return [{'id': a.id, 'titulo': a.titulo} for a in reporte.archivos.all()]


def _json_o_vacio(texto):
    try:
        return json.loads(texto) if texto else {}
    except ValueError:
        return {}


def _json_o_vacio(texto):
    try:
        return json.loads(texto) if texto else {}
    except ValueError:
        return {}


class InformeListaSerializer(serializers.ModelSerializer):
    """Versión liviana: sin el contenido del informe. La vista anota total_archivos."""
    tipo_nombre = serializers.CharField(source='fo_tipo_reporte.nombre_tipo', read_only=True)
    tipo_clave = serializers.CharField(source='fo_tipo_reporte.clave', read_only=True)
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True, default=None)
    parametros = serializers.SerializerMethodField()
    total_archivos = serializers.IntegerField(read_only=True)

    class Meta:
        model = Reporte
        fields = ['id', 'titulo', 'fo_tipo_reporte', 'tipo_nombre', 'tipo_clave', 'fecha_generacion',
                  'fo_usuario', 'usuario_nombre', 'parametros', 'total_archivos']
        read_only_fields = fields

    def get_parametros(self, reporte):
        return _json_o_vacio(reporte.parametros)


class InformeDetalleSerializer(InformeListaSerializer):
    contenido = serializers.SerializerMethodField()
    archivos = serializers.SerializerMethodField()

    class Meta(InformeListaSerializer.Meta):
        fields = InformeListaSerializer.Meta.fields + ['contenido', 'archivos']
        read_only_fields = fields

    def get_contenido(self, reporte):
        return _json_o_vacio(reporte.contenido)

    def get_archivos(self, reporte):
        return [{'id': a.id, 'titulo': a.titulo} for a in reporte.archivos.all()]
