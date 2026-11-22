import { ViewportScroller } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { RxStompState } from '@stomp/rx-stomp';
import { filter } from 'rxjs';
import { ButtonModule } from 'primeng/button';

import { AuthService } from '../../core/auth/auth.service';
import { ROLE_LABELS, Role } from '../../core/models/user.model';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { ThemeService } from '../../core/theme/theme.service';
import { NotificationBell } from '../notification-bell/notification-bell';

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

/** Sous cette largeur, la sidebar passe hors écran (bouton hamburger). */
const COMPACT_QUERY = '(max-width: 1023px)';

/** Coquille des pages connectées : sidebar bleu marine + en-tête utilisateur. */
@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ButtonModule, NotificationBell],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly scroller = inject(ViewportScroller);
  private readonly realtime = inject(RealtimeService);
  protected readonly theme = inject(ThemeService);

  private readonly sidebar = viewChild.required<ElementRef<HTMLElement>>('sidebar');
  private readonly burger = viewChild.required<ElementRef<HTMLButtonElement>>('burger');

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

  /** Notifications et état du temps réel : rôles ANALYSTE et ADMIN. */
  protected readonly isStaff = computed(() => {
    const role = this.user()?.role;
    return role === 'ANALYSTE' || role === 'ADMIN';
  });

  /** Vrai dès que le WebSocket a été ouvert une fois (distingue "connexion" et "reconnexion"). */
  private readonly wasOpen = signal(false);

  /** Indicateur affiché uniquement si le temps réel n'est pas connecté. */
  protected readonly realtimeIssue = computed(() => {
    const state = this.realtime.state();
    const wasOpen = this.wasOpen();
    if (state === RxStompState.OPEN) {
      return null;
    }
    if (state === RxStompState.CONNECTING) {
      return { down: false, label: wasOpen ? 'Reconnexion au temps réel…' : 'Connexion au temps réel…' };
    }
    return { down: true, label: 'Temps réel déconnecté' };
  });

  /** Menu hors écran ouvert / fermé (sous 1024 px). */
  protected readonly menuOpen = signal(false);
  protected readonly compact = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);
    effect(() => {
      if (this.realtime.state() === RxStompState.OPEN) {
        this.wasOpen.set(true);
      }
    });

    if (typeof matchMedia === 'function') {
      const query = matchMedia(COMPACT_QUERY);
      this.compact.set(query.matches);
      const onChange = (event: MediaQueryListEvent) => {
        this.compact.set(event.matches);
        if (!event.matches) {
          this.menuOpen.set(false);
        }
      };
      query.addEventListener('change', onChange);
      destroyRef.onDestroy(() => query.removeEventListener('change', onChange));
    }

    // Après chaque navigation : menu refermé, et retour en haut si la page change
    // (pas pour un simple changement de filtre dans l'URL)
    let previousPath = this.router.url.split(/[?#]/)[0];
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((e) => {
        this.menuOpen.set(false);
        const path = e.urlAfterRedirects.split(/[?#]/)[0];
        if (path !== previousPath) {
          this.scroller.scrollToPosition([0, 0]);
        }
        previousPath = path;
      });
  }

  protected toggleMenu(): void {
    if (this.menuOpen()) {
      this.closeMenu(true);
      return;
    }
    this.menuOpen.set(true);
    // Focus sur le premier lien une fois la sidebar rendue accessible (inert retiré)
    setTimeout(() => this.sidebar().nativeElement.querySelector<HTMLElement>('.nav-link')?.focus());
  }

  /** Ferme le menu mobile ; rend le focus au bouton hamburger si demandé (Échap, bouton fermer). */
  protected closeMenu(restoreFocus = false): void {
    if (!this.menuOpen()) {
      return;
    }
    this.menuOpen.set(false);
    if (restoreFocus) {
      this.burger().nativeElement.focus();
    }
  }

  protected logout(): void {
    this.auth.logout();
  }
}
