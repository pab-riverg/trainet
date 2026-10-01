import { Routes } from '@angular/router';
import { Main } from './estructura/main';
import { Dashboard } from './modulos/dashboard/dashboard';
import { Inicio } from './modulos/inicio/inicio';
import { TrinyAi } from './modulos/triny-ai/triny-ai';
import { Administrador } from './modulos/administrador/administrador';
import { Inventario } from './modulos/inventario/inventario';
import { Usuarios } from './modulos/usuarios/usuarios';
import { ComprasInternas } from './modulos/compras-internas/compras-internas';
import { Reportes } from './modulos/reportes/reportes';
import { Ajustes } from './modulos/ajustes/ajustes';
import { Ayuda } from './modulos/ayuda/ayuda';
import { Mas } from './modulos/mas/mas';
import { Login } from './modulos/login/login';
import { Perfil } from './modulos/perfil/perfil';

export const routes: Routes = [
  {
    path: '',
    component: Main,
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: Dashboard },
      { path: 'inicio', component: Inicio },
      { path: 'triny', component: TrinyAi },
      { path: 'administrador', component: Administrador },
      { path: 'inventario', component: Inventario },
      { path: 'usuarios', component: Usuarios },
      { path: 'compras', component: ComprasInternas },
      { path: 'reportes', component: Reportes },
      { path: 'ajustes', component: Ajustes },
      { path: 'ayuda', component: Ayuda },
      { path: 'mas', component: Mas },
      { path: 'perfil', component: Perfil }
    ]
  },
  { path: 'login', component: Login },
  { path: '**', redirectTo: '' }
];