import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptores/auth-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Solo se activa el scroll a fragmentos (#ancla). scrollPositionRestoration queda en 'disabled' (valor por defecto)
    // a propósito: 'top' o 'enabled' moverían el scroll también al cambiar solo el ?vista= de un módulo.
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'disabled' })),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
