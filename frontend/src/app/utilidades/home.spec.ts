import { CATALOGO_ROLES } from '../modelos/roles';
import { CAPTURAS_PRODUCTO, ROLES_HOME, capturaPorId, haySesionActiva, rolesSinCatalogo } from './home';

describe('utilidades del home', () => {
  it('cada rol de la landing existe en el catálogo del sistema y no falta ninguno', () => {
    expect(rolesSinCatalogo()).toEqual([]);
    expect(ROLES_HOME.map(rol => rol.codigo).sort()).toEqual(CATALOGO_ROLES.map(rol => rol.codigo).sort());
  });

  it('las capturas viven en /img/home como .webp y capturaPorId las encuentra', () => {
    for (const captura of CAPTURAS_PRODUCTO) {
      expect(captura.ruta).toBe(`/img/home/${captura.id}.webp`);
      expect(capturaPorId(captura.id)).toBe(captura);
    }
  });

  it('haySesionActiva sigue la clave del authGuard', () => {
    localStorage.removeItem('trainet_token');
    expect(haySesionActiva()).toBe(false);
    localStorage.setItem('trainet_token', 'x');
    expect(haySesionActiva()).toBe(true);
    localStorage.removeItem('trainet_token');
  });
});
