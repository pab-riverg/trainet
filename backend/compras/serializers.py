import os

from rest_framework import serializers

from proveedores.models import Proveedor

from .models import (
    Articulo,
    CategoriaArticulo,
    CotizacionCompra,
    EventoSolicitud,
    FacturaCompra,
    ItemOrden,
    ItemSolicitud,
    OrdenCompra,
    SolicitudCompra,
)

LIMITE_TAMANIO_IMAGEN = 2 * 1024 * 1024
EXTENSIONES_IMAGEN = ['jpg', 'jpeg', 'png', 'webp']
LIMITE_TAMANIO_DOCUMENTO = 10 * 1024 * 1024
EXTENSIONES_COTIZACION = ['pdf', 'doc', 'docx']
EXTENSIONES_FACTURA = ['pdf', 'png', 'jpg', 'jpeg']


def validar_documento(archivo, extensiones):
    if archivo.size > LIMITE_TAMANIO_DOCUMENTO:
        raise serializers.ValidationError('El archivo supera el límite de 10 MB.')
    extension = os.path.splitext(archivo.name)[1].lstrip('.').lower()
    if extension not in extensiones:
        raise serializers.ValidationError(
            f'Tipo de archivo no permitido. Extensiones válidas: {", ".join(extensiones)}.'
        )
    return archivo


class OrdenCompraCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdenCompra
        fields = ['id', 'descripcion', 'motivo', 'area', 'fo_mod_compras']


class OrdenCompraSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrdenCompra
        fields = '__all__'


class ItemOrdenSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemOrden
        fields = '__all__'


class CotizacionCompraSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='fo_proveedor.razon_social', read_only=True, default=None)
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True, default=None)
    es_elegida = serializers.SerializerMethodField()

    class Meta:
        model = CotizacionCompra
        fields = [
            'id', 'archivo', 'fecha_carga', 'monto_total', 'iva', 'fo_solicitud', 'fo_proveedor',
            'proveedor_nombre', 'fo_orden', 'fo_usuario', 'usuario_nombre', 'es_elegida',
        ]
        read_only_fields = ['fecha_carga', 'fo_orden', 'fo_usuario']
        extra_kwargs = {
            'fo_solicitud': {'required': True, 'allow_null': False},
            'fo_proveedor': {'required': True, 'allow_null': False},
            'monto_total': {'required': True, 'allow_null': False, 'min_value': 1},
        }

    def get_es_elegida(self, cotizacion):
        return SolicitudCompra.objects.filter(fo_cotizacion_elegida=cotizacion).exists()

    def validate_archivo(self, archivo):
        return validar_documento(archivo, EXTENSIONES_COTIZACION)

    def validate(self, datos):
        solicitud = datos['fo_solicitud']
        if solicitud.estado != 'aprobada':
            raise serializers.ValidationError(
                {'fo_solicitud': 'Solo se pueden cargar cotizaciones en solicitudes aprobadas.'}
            )
        if datos['fo_proveedor'].estado == 'inactivo':
            raise serializers.ValidationError({'fo_proveedor': 'El proveedor está inactivo.'})
        return datos


class FacturaCompraSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True, default=None)

    class Meta:
        model = FacturaCompra
        fields = ['id', 'archivo', 'descripcion', 'fecha_carga', 'fo_solicitud', 'fo_usuario', 'usuario_nombre']
        read_only_fields = ['fecha_carga', 'fo_usuario']

    def validate_archivo(self, archivo):
        return validar_documento(archivo, EXTENSIONES_FACTURA)

    def validate_fo_solicitud(self, solicitud):
        if solicitud.estado not in ('comprada', 'entregada', 'en_revision', 'recibida'):
            raise serializers.ValidationError(
                'Solo se pueden cargar facturas cuando la solicitud ya fue comprada.'
            )
        return solicitud


class EventoSolicitudSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True, default=None)

    class Meta:
        model = EventoSolicitud
        fields = ['id', 'tipo', 'detalle', 'usuario_nombre', 'fecha']
        read_only_fields = fields


class CategoriaArticuloSerializer(serializers.ModelSerializer):
    proveedores = serializers.PrimaryKeyRelatedField(many=True, queryset=Proveedor.objects.all(), required=False)
    proveedores_nombres = serializers.SerializerMethodField()

    class Meta:
        model = CategoriaArticulo
        fields = ['id', 'nombre', 'icono', 'proveedores', 'proveedores_nombres']

    def get_proveedores_nombres(self, categoria):
        return [proveedor.razon_social for proveedor in categoria.proveedores.all()]

    def validate_nombre(self, valor):
        valor = valor.strip()
        if not valor:
            raise serializers.ValidationError('El nombre es obligatorio.')
        return valor


class ArticuloSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.CharField(source='fo_categoria.nombre', read_only=True)
    categoria_icono = serializers.CharField(source='fo_categoria.icono', read_only=True)

    class Meta:
        model = Articulo
        fields = '__all__'

    def validate_imagen(self, imagen):
        if imagen.size > LIMITE_TAMANIO_IMAGEN:
            raise serializers.ValidationError('La imagen supera el límite de 2 MB.')
        extension = os.path.splitext(imagen.name)[1].lstrip('.').lower()
        if extension not in EXTENSIONES_IMAGEN:
            raise serializers.ValidationError(
                f'Formato de imagen no permitido. Usa: {", ".join(EXTENSIONES_IMAGEN)}.'
            )
        return imagen


class ItemSolicitudSerializer(serializers.ModelSerializer):
    articulo_nombre = serializers.CharField(source='fo_articulo.nombre', read_only=True)
    categoria_nombre = serializers.CharField(source='fo_articulo.fo_categoria.nombre', read_only=True)
    categoria_icono = serializers.CharField(source='fo_articulo.fo_categoria.icono', read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = ItemSolicitud
        fields = [
            'id', 'fo_articulo', 'articulo_nombre', 'categoria_nombre', 'categoria_icono',
            'cantidad', 'precio_unitario', 'subtotal', 'justificacion',
        ]
        read_only_fields = fields

    def get_subtotal(self, item):
        return item.cantidad * item.precio_unitario


class SolicitudCompraSerializer(serializers.ModelSerializer):
    items = ItemSolicitudSerializer(many=True, read_only=True)
    solicitante_nombre = serializers.CharField(source='fo_solicitante.nombre', read_only=True)
    aprobador_nombre = serializers.CharField(source='fo_aprobador.nombre', read_only=True, default=None)
    comprador_nombre = serializers.CharField(source='fo_comprador.nombre', read_only=True, default=None)
    entregado_por_nombre = serializers.CharField(source='fo_entregado_por.nombre', read_only=True, default=None)

    class Meta:
        model = SolicitudCompra
        fields = [
            'id', 'fecha_solicitud', 'area', 'nota', 'estado', 'total_estimado', 'motivo_decision',
            'fecha_decision', 'fo_solicitante', 'solicitante_nombre', 'fo_aprobador', 'aprobador_nombre',
            'fo_mod_compras', 'items',
            'fecha_compra', 'fo_comprador', 'comprador_nombre', 'fo_orden', 'fo_cotizacion_elegida',
            'fecha_entrega', 'fo_entregado_por', 'entregado_por_nombre', 'fecha_confirmacion',
            'motivo_reclamo', 'fecha_reclamo',
        ]
        read_only_fields = fields


class SolicitudCompraDetalleSerializer(SolicitudCompraSerializer):
    """Detalle: añade la bitácora (la lista la omite para no encarecerla)."""

    historial = EventoSolicitudSerializer(many=True, read_only=True)

    class Meta(SolicitudCompraSerializer.Meta):
        fields = SolicitudCompraSerializer.Meta.fields + ['historial']
        read_only_fields = fields


class ItemEntradaSerializer(serializers.Serializer):
    fo_articulo = serializers.PrimaryKeyRelatedField(queryset=Articulo.objects.all())
    cantidad = serializers.IntegerField(min_value=1)
    justificacion = serializers.CharField(required=False, allow_blank=True, default='')


class SolicitudCompraCrearSerializer(serializers.Serializer):
    """Entrada del carrito. Todo lo demás (estado, solicitante, totales, precios) lo fija el servidor."""

    area = serializers.CharField(max_length=255)
    nota = serializers.CharField(required=False, allow_blank=True, default='')
    items = ItemEntradaSerializer(many=True, allow_empty=False)

    def validate_items(self, items):
        vistos = set()
        for item in items:
            articulo = item['fo_articulo']
            if not articulo.disponible:
                raise serializers.ValidationError(f'El artículo "{articulo.nombre}" no está disponible.')
            if articulo.id in vistos:
                raise serializers.ValidationError(f'El artículo "{articulo.nombre}" está repetido en la solicitud.')
            vistos.add(articulo.id)
        return items


class DecisionCompraSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=['aprobada', 'rechazada'])
    motivo = serializers.CharField(max_length=1000)


class ConfirmarCompraSerializer(serializers.Serializer):
    cotizacion = serializers.IntegerField(min_value=1)
    comentario = serializers.CharField(required=False, allow_blank=True, max_length=1000, default='')


class EntregaSerializer(serializers.Serializer):
    nota = serializers.CharField(required=False, allow_blank=True, max_length=1000, default='')


class ReclamoSerializer(serializers.Serializer):
    motivo = serializers.CharField(required=False, allow_blank=True, max_length=1000, default='')


class ObservacionSerializer(serializers.Serializer):
    # trim_whitespace (por defecto) deja en blanco los textos de solo espacios, que se rechazan.
    observacion = serializers.CharField(max_length=500)
