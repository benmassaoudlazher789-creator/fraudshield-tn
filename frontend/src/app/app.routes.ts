import { inject } from '@angular/core';
import { Routes } from '@angular/router';

import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';
import { AuthService } from './core/auth/auth.service';

export const routes: Routes = [
  {
    path: 'login',
    title: 'Connexion — FraudShield TN',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    // Pages connectées : layout commun, puis espaces par rôle chargés à la demande
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout/main-layout').then((m) => m.MainLayout),
    children: [
      {
        path: 'client',
        canActivate: [roleGuard],
        data: { roles: ['CLIENT'] },
        loadChildren: () => import('./features/client/client.routes').then((m) => m.CLIENT_ROUTES),
      },
      {
        path: 'analyste',
        canActivate: [roleGuard],
        data: { roles: ['ANALYSTE', 'ADMIN'] },
        loadChildren: () => import('./features/analyst/analyst.routes').then((m) => m.ANALYST_ROUTES),
      },
      {
        path: 'admin',
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      // "/" : accueil selon le rôle
      { path: '', pathMatch: 'full', redirectTo: () => inject(AuthService).homeUrl() },
    ],
  },
  // URL inconnue : accueil (ou /login si déconnecté)
  { path: '**', redirectTo: () => inject(AuthService).homeUrl() },
];
