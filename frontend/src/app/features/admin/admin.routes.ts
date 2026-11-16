import { Routes } from '@angular/router';

// Espace administrateur
export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'utilisateurs' },
  {
    path: 'utilisateurs',
    title: 'Utilisateurs — FraudShield TN',
    data: { title: 'Utilisateurs' },
    loadComponent: () =>
      import('../../shared/under-construction/under-construction').then((m) => m.UnderConstruction),
  },
  {
    path: 'regles',
    title: 'Règles métier — FraudShield TN',
    data: { title: 'Règles métier' },
    loadComponent: () =>
      import('../../shared/under-construction/under-construction').then((m) => m.UnderConstruction),
  },
];
