import {
  ApplicationConfig,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';
import { jwtInterceptor } from './core/auth/jwt.interceptor';
import FraudShieldPreset from './theme/fraudshield-preset';

// Dates et nombres au format français
registerLocaleData(localeFr);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: FraudShieldPreset,
        // Thème sombre piloté par ThemeService (classe .fs-dark sur <html>)
        options: { darkModeSelector: '.fs-dark' },
      },
      translation: {
        accept: 'Oui',
        reject: 'Non',
        emptyMessage: 'Aucun résultat',
        emptyFilterMessage: 'Aucun résultat',
        passwordPrompt: 'Saisissez un mot de passe',
        weak: 'Faible',
        medium: 'Moyen',
        strong: 'Fort',
      },
    }),
  ],
};
