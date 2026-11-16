import { Routes } from '@angular/router';

// Espace client (pages provisoires, remplacées dans les sous-étapes suivantes)
export const CLIENT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'paiement' },
  {
    path: 'paiement',
    title: 'Paiement — FraudShield TN',
    data: { title: 'Paiement' },
    loadComponent: () =>
      import('../../shared/under-construction/under-construction').then((m) => m.UnderConstruction),
  },
  {
    path: 'transactions',
    title: 'Mes transactions — FraudShield TN',
    data: { title: 'Mes transactions' },
    loadComponent: () =>
      import('../../shared/under-construction/under-construction').then((m) => m.UnderConstruction),
  },
];
