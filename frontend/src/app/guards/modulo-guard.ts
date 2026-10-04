import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { InicioService } from '../servicios/inicio';

/**
 * Protege una ruta por rol. Lee la clave del módulo en `data: { modulo: '<clave>' }` y la compara con los módulos
 * que el backend declara visibles para el usuario. Espera a que el menú esté cargado (también tras recargar con F5);
 * si el rol no tiene el módulo, redirige a /inicio. El backend sigue validando cada endpoint.
 */
export const moduloGuard: CanActivateFn = route => {
  const inicio = inject(InicioService);
  const router = inject(Router);
  const clave = route.data['modulo'] as string | undefined;

  return inicio.asegurarModulos().pipe(
    map(cargado => {
      const permitido = cargado && (!clave || inicio.modulos().some(modulo => modulo.clave === clave));
      return permitido ? true : router.createUrlTree(['/inicio']);
    })
  );
};
