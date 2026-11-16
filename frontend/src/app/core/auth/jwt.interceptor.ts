import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const LOGIN_URL = `${environment.apiUrl}/api/auth/login`;

/**
 * Ajoute le JWT aux appels vers notre API uniquement (jamais vers un autre domaine).
 * Un 401 hors connexion = token expiré ou invalide : déconnexion et retour à /login.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isApiCall = req.url.startsWith(environment.apiUrl);

  const request =
    token && isApiCall ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && isApiCall && req.url !== LOGIN_URL) {
        auth.logout();
      }
      return throwError(() => error);
    }),
  );
};
