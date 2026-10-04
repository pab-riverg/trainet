import { DominioEstado, VarianteEstado, claveEstado, textoEstado, varianteEstado } from './estados';

// Tabla de referencia: dominio -> valor (código del API) -> variante esperada.
const ESPERADO: Record<Exclude<DominioEstado, 'general'>, Record<string, VarianteEstado>> = {
  usuario: { activo: 'exito', inactivo: 'neutro' },
  ticket: { abierto: 'info', en_proceso: 'aviso', resuelto: 'exito', cerrado: 'neutro' },
  prioridad: { baja: 'neutro', media: 'info', alta: 'aviso', urgente: 'peligro' },
  compra: {
    pendiente: 'aviso', aprobada: 'info', rechazada: 'peligro', comprada: 'info', entregada: 'info',
    en_revision: 'aviso', recibida: 'exito'
  },
  recurso: { pendiente: 'aviso', aprobado: 'info', rechazado: 'peligro', entregado: 'exito' },
  curso: { planificado: 'info', en_curso: 'aviso', finalizado: 'exito' },
  capacitacion: { si: 'exito', no: 'neutro' },
  proveedor: { sin_contratar: 'neutro', contratado: 'exito', inactivo: 'neutro' },
  cotizacion: { pendiente: 'aviso', aprobada: 'exito', rechazada: 'peligro' },
  acuerdo: {
    pendiente_aprobacion: 'aviso', vigente: 'exito', finalizado: 'neutro', cancelado: 'neutro', rechazado: 'peligro'
  },
  informe: { activo: 'exito', archivado: 'neutro', csv: 'info', xlsx: 'info' },
  catalogo: {
    disponible: 'exito', no_disponible: 'neutro', elegida: 'exito', actualizado: 'info', activa: 'exito', inactiva: 'neutro'
  },
  bitacora: {
    login_fallido: 'aviso', usuario_eliminado: 'peligro', archivo_eliminado: 'peligro', informe_eliminado: 'peligro',
    usuario_creado: 'exito', archivo_importado: 'exito', informe_generado: 'exito', informe_consolidado: 'exito'
  },
  asistente: {
    resuelta: 'exito', sin_resolver: 'aviso', util: 'exito', no_util: 'peligro', sin_valorar: 'neutro', sin_respuesta: 'aviso'
  }
};

describe('varianteEstado', () => {
  for (const [dominio, valores] of Object.entries(ESPERADO)) {
    it(`cada estado conocido de "${dominio}" tiene su variante`, () => {
      for (const [valor, variante] of Object.entries(valores)) {
        expect(varianteEstado(dominio as DominioEstado, valor), `${dominio}/${valor}`).toBe(variante);
      }
    });
  }

  it('un valor desconocido, vacío o nulo es neutro (también acciones de bitácora sin regla)', () => {
    expect(varianteEstado('ticket', 'inventado')).toBe('neutro');
    expect(varianteEstado('general', 'inventado')).toBe('neutro');
    expect(varianteEstado('compra', '')).toBe('neutro');
    expect(varianteEstado('usuario', null)).toBe('neutro');
    expect(varianteEstado('usuario', undefined)).toBe('neutro');
    expect(varianteEstado('bitacora', 'login_ok')).toBe('neutro');
  });

  it('tolera mayúsculas, espacios, tildes y valores antiguos en minúscula', () => {
    expect(varianteEstado('ticket', 'en proceso')).toBe('aviso');
    expect(varianteEstado('ticket', 'En proceso')).toBe('aviso');
    expect(varianteEstado('ticket', '  EN_PROCESO  ')).toBe('aviso');
    expect(varianteEstado('compra', 'En revisión')).toBe('aviso');
    expect(varianteEstado('acuerdo', 'Pendiente de aprobación')).toBe('aviso');
    expect(varianteEstado('capacitacion', 'Sí')).toBe('exito');
    expect(varianteEstado('asistente', 'Sin resolver')).toBe('aviso');
    expect(varianteEstado('catalogo', 'No disponible')).toBe('neutro');
  });

  it('el dominio general reconoce los estados de cualquier módulo', () => {
    expect(varianteEstado('general', 'Abierto')).toBe('info');
    expect(varianteEstado('general', 'Aprobada')).toBe('info');
    expect(varianteEstado('general', 'Vigente')).toBe('exito');
    expect(varianteEstado('general', 'Rechazado')).toBe('peligro');
    expect(varianteEstado('general', 'En curso')).toBe('aviso');
    expect(varianteEstado('curso', 'Finalizado')).toBe('exito');
  });
});

describe('claveEstado y textoEstado', () => {
  it('claveEstado normaliza', () => {
    expect(claveEstado(' En revisión ')).toBe('en_revision');
    expect(claveEstado('sin-contratar')).toBe('sin_contratar');
    expect(claveEstado(null)).toBe('');
  });

  it('textoEstado recorta y pone la primera letra en mayúscula sin tocar el resto', () => {
    expect(textoEstado('  en proceso ')).toBe('En proceso');
    expect(textoEstado('En proceso')).toBe('En proceso');
    expect(textoEstado('CSV')).toBe('CSV');
    expect(textoEstado('')).toBe('');
    expect(textoEstado(undefined)).toBe('');
  });
});
