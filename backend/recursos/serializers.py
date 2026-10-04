import os

from rest_framework import serializers

from .models import ModuloPedidoRecursos, SolicitudRecursos, TipoRecurso

LIMITE_TAMANIO_ENTREGA = 20 * 1024 * 1024
EXTENSIONES_ENTREGA = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', 'png', 'jpg', 'jpeg', 'zip']


class ModuloPedidoRecursosSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuloPedidoRecursos
        fields = '__all__'


class TipoRecursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoRecurso
        fields = '__all__'


class SolicitudRecursosCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SolicitudRecursos
        fields = ['id', 'cantidad', 'justificacion', 'prioridad', 'fo_tipo_recurso', 'fo_mod_pedido']

    def validate_cantidad(self, valor):
        if valor < 1:
            raise serializers.ValidationError('La cantidad debe ser al menos 1.')
        return valor

    def validate_justificacion(self, valor):
        valor = valor.strip()
        if not valor:
            raise serializers.ValidationError('La justificación es obligatoria.')
        return valor


class SolicitudRecursosSerializer(serializers.ModelSerializer):
    tipo_nombre = serializers.CharField(source='fo_tipo_recurso.nombre_tipo', read_only=True)
    tipo_disponible = serializers.BooleanField(source='fo_tipo_recurso.disponible', read_only=True)
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True)

    class Meta:
        model = SolicitudRecursos
        fields = [
            'id', 'fecha_solicitud', 'cantidad', 'justificacion', 'prioridad', 'estado',
            'presupuesto_estimado', 'comentario_encargado', 'archivo_entrega',
            'fo_tipo_recurso', 'fo_usuario', 'fo_mod_pedido',
            'tipo_nombre', 'tipo_disponible', 'usuario_nombre',
        ]
        read_only_fields = fields


class DecisionSolicitudSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=['aprobado', 'rechazado'])
    comentario_encargado = serializers.CharField(required=False, allow_blank=True, max_length=255, default='')
    presupuesto_estimado = serializers.IntegerField(required=False, min_value=0)

    def validate(self, datos):
        datos['comentario_encargado'] = datos.get('comentario_encargado', '').strip()
        if datos['estado'] == 'rechazado' and not datos['comentario_encargado']:
            raise serializers.ValidationError({'comentario_encargado': 'El comentario es obligatorio al rechazar.'})
        return datos


class EntregaSolicitudSerializer(serializers.Serializer):
    archivo = serializers.FileField()

    def validate_archivo(self, archivo):
        if archivo.size > LIMITE_TAMANIO_ENTREGA:
            raise serializers.ValidationError('El archivo supera el límite de 20 MB.')
        extension = os.path.splitext(archivo.name)[1].lstrip('.').lower()
        if extension not in EXTENSIONES_ENTREGA:
            raise serializers.ValidationError(
                f'Tipo de archivo no permitido. Extensiones válidas: {", ".join(EXTENSIONES_ENTREGA)}.'
            )
        return archivo
