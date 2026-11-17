import { Routes } from '@angular/router';

// Espace administrateur
export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'utilisateurs' },
  {
    path: 'utilisateurs',
    title: 'Utilisateurs — FraudShield TN',
    loadComponent: () => import('./users/users').then((m) => m.Users),
  },
  {
    path: 'regles',
    title: 'Règles métier — FraudShield TN',
    loadComponent: () => import('./rules/rules').then((m) => m.Rules),
  },
];
