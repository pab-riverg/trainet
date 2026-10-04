import { Routes } from '@angular/router';
import { Main } from './estructura/main';
import { Login } from './modulos/login/login';
import { Home } from './modulos/home/home';
import { authGuard } from './guards/auth-guard';
import { moduloGuard } from './guards/modulo-guard';

// Ruta hija protegida por rol: el guard compara la clave con los módulos visibles que declara el backend.
const protegida = (modulo: string) => ({ canActivate: [moduloGuard], data: { modulo } });

export const routes: Routes = [
  { path: '', component: Home, pathMatch: 'full' },
  // /home es un alias de la landing (la redirección conserva el fragmento: /home#sobre-trainet).
  { path: 'home', redirectTo: '', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'recuperar', loadComponent: () => import('./modulos/recuperar-password/recuperar-password').then(m => m.RecuperarPassword) },
  {
    path: '',
    component: Main,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./modulos/dashboard/dashboard').then(m => m.Dashboard), ...protegida('dashboard') },
      { path: 'inicio', loadComponent: () => import('./modulos/inicio/inicio').then(m => m.Inicio) },
      { path: 'triny', loadComponent: () => import('./modulos/triny-ai/triny-ai').then(m => m.TrinyAi), ...protegida('triny') },
      { path: 'administrador', loadComponent: () => import('./modulos/administrador/administrador').then(m => m.Administrador), ...protegida('administrador') },
      { path: 'inventario', loadComponent: () => import('./modulos/inventario/inventario').then(m => m.Inventario), ...protegida('inventario') },
      { path: 'usuarios', loadComponent: () => import('./modulos/usuarios/usuarios').then(m => m.Usuarios), ...protegida('usuarios') },
      { path: 'compras', loadComponent: () => import('./modulos/compras-internas/compras-internas').then(m => m.ComprasInternas), ...protegida('compras') },
      { path: 'reportes', loadComponent: () => import('./modulos/reportes/reportes').then(m => m.Reportes), ...protegida('reportes') },
      { path: 'ajustes', loadComponent: () => import('./modulos/ajustes/ajustes').then(m => m.Ajustes), ...protegida('ajustes') },
      { path: 'ayuda', loadComponent: () => import('./modulos/ayuda/ayuda').then(m => m.Ayuda), ...protegida('ayuda') },
      { path: 'perfil', loadComponent: () => import('./modulos/perfil/perfil').then(m => m.Perfil) },
      { path: 'capacitacion', loadComponent: () => import('./modulos/capacitacion/capacitacion').then(m => m.Capacitacion), ...protegida('capacitacion') },
      { path: 'documentos', loadComponent: () => import('./modulos/documentos/documentos').then(m => m.Documentos), ...protegida('documentos') },
      { path: 'soporte', loadComponent: () => import('./modulos/soporte/soporte').then(m => m.Soporte), ...protegida('soporte') },
      { path: 'recursos', loadComponent: () => import('./modulos/recursos/recursos').then(m => m.Recursos), ...protegida('recursos') },
      { path: 'proveedores', loadComponent: () => import('./modulos/proveedores/proveedores').then(m => m.Proveedores), ...protegida('proveedores') }
    ]
  },
  { path: '**', redirectTo: '' }
];
