import { Routes } from '@angular/router';

// Espace analyste (aussi accessible à l'administrateur)
export const ANALYST_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tableau-de-bord' },
  {
    path: 'tableau-de-bord',
    title: 'Tableau de bord — FraudShield TN',
    loadComponent: () => import('./dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'alertes',
    title: 'Alertes — FraudShield TN',
    loadComponent: () => import('./alerts/alerts').then((m) => m.Alerts),
  },
  {
    path: 'alertes/:id',
    title: "Détail d'une alerte — FraudShield TN",
    loadComponent: () => import('./alert-detail/alert-detail').then((m) => m.AlertDetailPage),
  },
  {
    path: 'statistiques',
    title: 'Statistiques — FraudShield TN',
    loadComponent: () => import('./statistics/statistics').then((m) => m.Statistics),
  },
];
