import { Routes } from '@angular/router';

// Espace analyste (aussi accessible à l'administrateur)
export const ANALYST_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
  {
    path: 'tableau-de-bord',
    title: 'Tableau de bord — FraudShield TN',
    data: { title: 'Tableau de bord' },
    loadComponent: () =>
      import('../../shared/under-construction/under-construction').then((m) => m.UnderConstruction),
  },
  {
    path: 'alertes',
    title: 'Alertes — FraudShield TN',
    data: { title: 'Alertes' },
    loadComponent: () =>
      import('../../shared/under-construction/under-construction').then((m) => m.UnderConstruction),
  },
  {
    path: 'statistiques',
    title: 'Statistiques — FraudShield TN',
    data: { title: 'Statistiques' },
    loadComponent: () =>
      import('../../shared/under-construction/under-construction').then((m) => m.UnderConstruction),
  },
];
