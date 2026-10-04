import {
  puedeConsolidar, puedeGenerar, puedeGestionar, puedeImportar, puedeLeer, puedeVerArchivos
} from './permisos-reportes';

describe('permisos de Reportes (reflejo del backend)', () => {
  const roles = ['administrador', 'directivo', 'supervisor', 'recursos_humanos', 'encargado_documental'];

  it('solo cinco roles entran al módulo', () => {
    expect(roles.every(rol => puedeLeer(rol))).toBe(true);
    for (const rol of ['empleado', 'encargado_formacion', 'proveedor_contenido', 'capacitador', '']) {
      expect(puedeLeer(rol)).toBe(false);
    }
    expect(puedeLeer(null)).toBe(false);
  });

  it('importar: administrador, recursos humanos y encargado documental; no directivo ni supervisor', () => {
    expect(roles.filter(puedeImportar)).toEqual(['administrador', 'recursos_humanos', 'encargado_documental']);
  });

  it('el supervisor no ve la sección de archivos; el directivo sí (solo consulta)', () => {
    expect(puedeVerArchivos('supervisor')).toBe(false);
    expect(puedeVerArchivos('directivo')).toBe(true);
    expect(puedeVerArchivos('encargado_documental')).toBe(true);
  });

  it('generar por rango de fechas: todos salvo el encargado documental (solo consolida)', () => {
    expect(roles.filter(puedeGenerar)).toEqual(['administrador', 'directivo', 'supervisor', 'recursos_humanos']);
    expect(roles.filter(puedeConsolidar)).toEqual(['administrador', 'directivo', 'recursos_humanos', 'encargado_documental']);
  });

  it('solo el administrador gestiona', () => {
    expect(roles.filter(puedeGestionar)).toEqual(['administrador']);
  });
});
