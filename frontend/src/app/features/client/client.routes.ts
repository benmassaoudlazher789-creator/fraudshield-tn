import { Routes } from '@angular/router';

// Espace client
export const CLIENT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'paiement' },
  {
    path: 'paiement',
    title: 'Paiement — FraudShield TN',
    loadComponent: () => import('./payment/payment').then((m) => m.Payment),
  },
  {
    path: 'transactions',
    title: 'Mes transactions — FraudShield TN',
    loadComponent: () => import('./transactions/transactions').then((m) => m.Transactions),
  },
];
