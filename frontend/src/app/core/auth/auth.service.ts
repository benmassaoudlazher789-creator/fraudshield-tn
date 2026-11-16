import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, Role, User } from '../models/user.model';

const TOKEN_KEY = 'fs_token';
const USER_KEY = 'fs_user';

/** Page d'accueil de chaque rôle après connexion. */
const HOME_BY_ROLE: Record<Role, string> = {
  CLIENT: '/client/paiement',
  ANALYSTE: '/analyste/tableau-de-bord',
  ADMIN: '/admin/utilisateurs',
};

/** Authentification JWT : connexion, déconnexion et utilisateur courant. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(null);
  private readonly _user = signal<User | null>(null);

  /** Utilisateur connecté (null si déconnecté). */
  readonly currentUser = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null && this._token() !== null);

  constructor() {
    this.restoreSession();
  }

  login(request: LoginRequest): Observable<User> {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/api/auth/login`, request).pipe(
      tap((res) => this.storeSession(res)),
      map(({ token: _token, ...user }) => user),
    );
  }

  /** Vide la session ; redirige vers /login par défaut. */
  logout(redirect = true): void {
    this._token.set(null);
    this._user.set(null);
    safeStorage(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    });
    if (redirect) {
      void this.router.navigateByUrl('/login');
    }
  }

  token(): string | null {
    return this._token();
  }

  hasRole(...roles: Role[]): boolean {
    const user = this._user();
    return user !== null && roles.includes(user.role);
  }

  /** URL d'accueil de l'utilisateur courant (ou /login). */
  homeUrl(): string {
    const user = this._user();
    return user ? HOME_BY_ROLE[user.role] : '/login';
  }

  private storeSession(res: AuthResponse): void {
    if (!res.token) {
      return;
    }
    const user: User = { userId: res.userId, fullName: res.fullName, email: res.email, role: res.role };
    this._token.set(res.token);
    this._user.set(user);
    safeStorage(() => {
      localStorage.setItem(TOKEN_KEY, res.token as string);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    });
  }

  /** Recharge la session depuis localStorage si le token n'est pas expiré. */
  private restoreSession(): void {
    const stored = safeStorage(() => ({
      token: localStorage.getItem(TOKEN_KEY),
      user: localStorage.getItem(USER_KEY),
    }));
    if (!stored?.token || !stored.user || isExpired(stored.token)) {
      this.logout(false);
      return;
    }
    try {
      const user = JSON.parse(stored.user) as User;
      if (user.role in HOME_BY_ROLE) {
        this._token.set(stored.token);
        this._user.set(user);
        return;
      }
    } catch {
      // JSON corrompu : on repart d'une session vide
    }
    this.logout(false);
  }
}

/** localStorage peut être indisponible (navigation privée, stockage bloqué). */
function safeStorage<T>(action: () => T): T | null {
  try {
    return action();
  } catch {
    return null;
  }
}

/** Lit la date d'expiration (claim exp) du JWT sans vérifier la signature. */
function isExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload)) as { exp?: number };
    return typeof exp === 'number' && exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}
