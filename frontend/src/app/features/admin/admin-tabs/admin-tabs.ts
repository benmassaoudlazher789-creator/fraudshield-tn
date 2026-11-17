import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** Onglets "Utilisateurs / Règles métier" de l'en-tête des pages d'administration (maquette). */
@Component({
  selector: 'app-admin-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="tabs" aria-label="Administration">
      <a routerLink="/admin/utilisateurs" routerLinkActive="active" ariaCurrentWhenActive="page">
        <i class="pi pi-users" aria-hidden="true"></i>Utilisateurs
      </a>
      <a routerLink="/admin/regles" routerLinkActive="active" ariaCurrentWhenActive="page">
        <i class="pi pi-sliders-h" aria-hidden="true"></i>Règles métier
      </a>
    </nav>
  `,
  styles: `
    .tabs {
      display: inline-flex;
      gap: 0.25rem;
      padding: 0.25rem;
      border-radius: var(--fs-radius-lg);
      background: var(--fs-surface-high);
    }
    a {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: var(--fs-radius);
      color: var(--fs-text-muted);
      font-weight: 600;
      text-decoration: none;
    }
    a:hover {
      color: var(--fs-primary-dark);
    }
    a.active {
      background: var(--fs-primary);
      color: #fff;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminTabs {}
