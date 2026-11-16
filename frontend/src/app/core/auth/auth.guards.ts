import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Role } from '../models/user.model';
import { AuthService } from './auth.service';

/** Bloque les pages protégées si l'utilisateur n'est pas connecté. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? true : inject(Router).parseUrl('/login');
};

/**
 * Vérifie le rôle demandé dans data.roles de la route.
 * Rôle non autorisé : retour à la page d'accueil de l'utilisateur.
 */
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles = (route.data['roles'] ?? []) as Role[];

  if (!auth.isLoggedIn()) {
    return router.parseUrl('/login');
  }
  return roles.length === 0 || auth.hasRole(...roles) ? true : router.parseUrl(auth.homeUrl());
};

/** Page de connexion : un utilisateur déjà connecté est renvoyé vers son accueil. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isLoggedIn() ? inject(Router).parseUrl(auth.homeUrl()) : true;
};
