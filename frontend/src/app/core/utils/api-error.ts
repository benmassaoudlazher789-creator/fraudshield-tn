import { HttpErrorResponse } from '@angular/common/http';

import { ApiError } from '../models/client.model';

/** Message lisible à partir d'une erreur HTTP (message du backend en priorité). */
export function apiErrorMessage(err: unknown, fallback = 'Une erreur inattendue est survenue.'): string {
  if (!(err instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (err.status === 0) {
    return 'Serveur injoignable. Vérifiez votre connexion puis réessayez.';
  }
  const body = err.error as Partial<ApiError> | null;
  if (body && typeof body === 'object') {
    // Erreurs de validation : détail du premier champ en plus du message général
    const fieldMessages = body.fieldErrors ? Object.values(body.fieldErrors) : [];
    if (body.message) {
      return fieldMessages.length ? `${body.message} : ${fieldMessages.join(', ')}` : body.message;
    }
  }
  return fallback;
}
