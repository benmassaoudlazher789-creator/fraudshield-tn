import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ButtonModule } from 'primeng/button';

import { AuthService } from '../../core/auth/auth.service';
import { ROLE_LABELS, Role } from '../../core/models/user.model';

interface MenuItem {
  label: string;
  icon: string;
  link: string;
}

/** Menus de la sidebar selon le rôle. */
const MENUS: Record<Role, MenuItem[]> = {
  CLIENT: [
    { label: 'Paiement', icon: 'pi pi-send', link: '/client/paiement' },
    { label: 'Mes transactions', icon: 'pi pi-list', link: '/client/transactions' },
  ],
  ANALYSTE: [
    { label: 'Tableau de bord', icon: 'pi pi-th-large', link: '/analyste/tableau-de-bord' },
    { label: 'Alertes', icon: 'pi pi-exclamation-triangle', link: '/analyste/alertes' },
    { label: 'Statistiques', icon: 'pi pi-chart-bar', link: '/analyste/statistiques' },
  ],
  ADMIN: [
    { label: 'Tableau de bord', icon: 'pi pi-th-large', link: '/analyste/tableau-de-bord' },
    { label: 'Alertes', icon: 'pi pi-exclamation-triangle', link: '/analyste/alertes' },
    { label: 'Statistiques', icon: 'pi pi-chart-bar', link: '/analyste/statistiques' },
    { label: 'Utilisateurs', icon: 'pi pi-users', link: '/admin/utilisateurs' },
    { label: 'Règles métier', icon: 'pi pi-sliders-h', link: '/admin/regles' },
  ],
};

/** Coquille des pages connectées : sidebar bleu marine + en-tête utilisateur. */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.currentUser;
  protected readonly menu = computed(() => {
    const user = this.user();
    return user ? MENUS[user.role] : [];
  });
  protected readonly roleLabel = computed(() => {
    const user = this.user();
    return user ? ROLE_LABELS[user.role] : '';
  });
  /** Initiales pour l'avatar : "Karim Ben Salem" -> "KB". */
  protected readonly initials = computed(() =>
    (this.user()?.fullName ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join(''),
  );

  /** Menu mobile ouvert / fermé. */
  protected readonly menuOpen = signal(false);

  constructor() {
    // Referme le menu mobile après chaque navigation
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected logout(): void {
    this.auth.logout();
  }
}
