import os
import re

from rest_framework import serializers

from trainet_backend.validadores import validar_nit, validar_telefono

from .models import (
    ContratoProveedor,
    CotizacionProveedor,
    ModuloGestionProveedores,
    NecesidadCapacitacionExterna,
    Proveedor,
    ServicioProveedor,
)

LIMITE_TAMANIO_ARCHIVO = 10 * 1024 * 1024
EXTENSIONES_COTIZACION = ['pdf', 'doc', 'docx']
EXTENSIONES_CONTRATO = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg']


def validar_archivo(archivo, extensiones):
    if archivo.size > LIMITE_TAMANIO_ARCHIVO:
        raise serializers.ValidationError('El archivo supera el límite de 10 MB.')
    extension = os.path.splitext(archivo.name)[1].lstrip('.').lower()
    if extension not in extensiones:
        raise serializers.ValidationError(
            f'Tipo de archivo no permitido. Extensiones válidas: {", ".join(extensiones)}.'
        )
    return archivo


def normalizar_rut(rut):
    return re.sub(r'[^0-9kK]', '', rut).upper()


class ModuloGestionProveedoresSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModuloGestionProveedores
        fields = '__all__'


class ProveedorSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(max_length=255)
    tiene_cotizacion_aprobada = serializers.SerializerMethodField()

    class Meta:
        model = Proveedor
        fields = '__all__'
        read_only_fields = ['calificacion']
        extra_kwargs = {
            'rut': {'error_messages': {'blank': 'El NIT es obligatorio.', 'required': 'El NIT es obligatorio.',
                                       'null': 'El NIT es obligatorio.'}},
            'telefono': {'error_messages': {'blank': 'El teléfono es obligatorio.', 'required': 'El teléfono es obligatorio.',
                                            'null': 'El teléfono es obligatorio.'}},
        }

    def get_tiene_cotizacion_aprobada(self, proveedor):
        return proveedor.cotizacionproveedor_set.filter(estado='aprobada').exists()

    def validate_rut(self, valor):
        # El campo `rut` guarda el NIT del proveedor (solo cambia el nombre visible en el frontend).
        valor = validar_nit(valor)
        otros = Proveedor.objects.exclude(pk=self.instance.pk) if self.instance else Proveedor.objects.all()
        # Los valores antiguos pueden traer puntos o guiones: se comparan normalizados.
        if any(normalizar_rut(rut) == valor for rut in otros.values_list('rut', flat=True)):
            raise serializers.ValidationError('Este NIT ya está registrado.')
        return valor

    def validate_telefono(self, valor):
        valor = validar_telefono(valor)
        if not valor:
            raise serializers.ValidationError('El teléfono es obligatorio.')
        return valor

    def validate_razon_social(self, valor):
        valor = valor.strip()
        if not valor:
            raise serializers.ValidationError('El nombre o razón social es obligatorio.')
        return valor


class ServicioProveedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServicioProveedor
        fields = '__all__'


class NecesidadCapacitacionExternaSerializer(serializers.ModelSerializer):
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True)

    class Meta:
        model = NecesidadCapacitacionExterna
        fields = '__all__'
        read_only_fields = ['fecha', 'fo_usuario']

    def validate_tema(self, valor):
        valor = valor.strip()
        if not valor:
            raise serializers.ValidationError('El tema es obligatorio.')
        return valor


class CotizacionProveedorSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='fo_proveedor.razon_social', read_only=True)
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True, default=None)

    class Meta:
        model = CotizacionProveedor
        fields = '__all__'
        read_only_fields = ['fecha_carga', 'fo_usuario']

    def validate_archivo(self, archivo):
        return validar_archivo(archivo, EXTENSIONES_COTIZACION)

    def validate_fo_proveedor(self, proveedor):
        if self.instance and self.instance.fo_proveedor_id != proveedor.id:
            raise serializers.ValidationError('No se puede cambiar el proveedor de una cotización.')
        return proveedor


class ContratoProveedorSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source='fo_proveedor.razon_social', read_only=True)
    usuario_nombre = serializers.CharField(source='fo_usuario.nombre', read_only=True, default=None)
    aprobador_nombre = serializers.CharField(source='fo_aprobador.nombre', read_only=True, default=None)
    cotizacion_estado = serializers.CharField(source='fo_cotizacion.estado', read_only=True, default=None)
    cotizacion_archivo = serializers.FileField(source='fo_cotizacion.archivo', read_only=True, default=None)

    class Meta:
        model = ContratoProveedor
        fields = '__all__'
        read_only_fields = ['fo_usuario', 'fo_aprobador', 'fecha_decision', 'motivo_decision']

    def validate_archivo(self, archivo):
        return validar_archivo(archivo, EXTENSIONES_CONTRATO)

    def validate(self, datos):
        instancia = self.instance
        proveedor = datos.get('fo_proveedor', instancia.fo_proveedor if instancia else None)
        inicio = datos.get('fecha_inicio', instancia.fecha_inicio if instancia else None)
        fin = datos.get('fecha_fin', instancia.fecha_fin if instancia else None)

        if instancia and proveedor.id != instancia.fo_proveedor_id:
            raise serializers.ValidationError({'fo_proveedor': 'No se puede cambiar el proveedor de un acuerdo.'})

        if inicio and fin and fin < inicio:
            raise serializers.ValidationError({'fecha_fin': 'La fecha de fin no puede ser anterior a la fecha de inicio.'})

        cotizacion = datos.get('fo_cotizacion')
        if cotizacion is not None:
            if cotizacion.fo_proveedor_id != proveedor.id:
                raise serializers.ValidationError({'fo_cotizacion': 'La cotización no pertenece a este proveedor.'})
            if cotizacion.estado != 'aprobada':
                raise serializers.ValidationError({'fo_cotizacion': 'La cotización seleccionada no está aprobada.'})

        if instancia is not None:
            self._validar_edicion(instancia, datos)
        else:
            aprobadas = CotizacionProveedor.objects.filter(fo_proveedor=proveedor, estado='aprobada')
            if not aprobadas.exists():
                raise serializers.ValidationError(
                    'El proveedor no tiene ninguna cotización aprobada. Aprueba una cotización antes de registrar el acuerdo.'
                )
            if cotizacion is None:
                datos['fo_cotizacion'] = aprobadas.order_by('-fecha_carga').first()

        return datos

    def _validar_edicion(self, instancia, datos):
        nuevo_estado = datos.get('estado')
        if nuevo_estado is not None and nuevo_estado != instancia.estado:
            if instancia.estado != 'vigente' or nuevo_estado not in ('finalizado', 'cancelado'):
                raise serializers.ValidationError({
                    'estado': 'Solo un acuerdo vigente puede finalizarse o cancelarse. '
                              'La aprobación o el rechazo se registran con la decisión.'
                })

        if 'fo_cotizacion' in datos and datos['fo_cotizacion'] != instancia.fo_cotizacion:
            raise serializers.ValidationError({'fo_cotizacion': 'No se puede cambiar la cotización de un acuerdo.'})

        if instancia.estado != 'pendiente_aprobacion':
            bloqueados = [
                campo for campo in ('descripcion', 'fecha_inicio', 'fecha_fin')
                if campo in datos and datos[campo] != getattr(instancia, campo)
            ]
            if 'archivo' in datos:
                bloqueados.append('archivo')
            if bloqueados:
                raise serializers.ValidationError(
                    'Solo se puede editar la descripción, las fechas y el archivo mientras el acuerdo está '
                    f'pendiente de aprobación (campos: {", ".join(bloqueados)}).'
                )


class DecisionAcuerdoSerializer(serializers.Serializer):
    estado = serializers.ChoiceField(choices=['aprobado', 'rechazado'])
    motivo = serializers.CharField(required=False, allow_blank=True, max_length=1000, default='')

    def validate(self, datos):
        datos['motivo'] = datos.get('motivo', '').strip()
        if datos['estado'] == 'rechazado' and not datos['motivo']:
            raise serializers.ValidationError({'motivo': 'El motivo es obligatorio al rechazar un acuerdo.'})
        return datos
