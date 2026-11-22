import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'fs_theme';
const DARK_CLASS = 'fs-dark';

/**
 * Thème clair / sombre.
 * - sans choix mémorisé : suit prefers-color-scheme (y compris en direct)
 * - choix de l'utilisateur mémorisé dans localStorage (s'il est disponible)
 * La classe .fs-dark posée sur <html> pilote les tokens CSS et le preset PrimeNG.
 * Le script inline d'index.html applique déjà le thème avant le premier rendu.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly root = inject(DOCUMENT).documentElement;
  private readonly media =
    typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;

  private readonly systemDark = signal(this.media?.matches ?? false);
  private readonly chosen = signal<Theme | null>(readStoredTheme());

  /** Thème effectif. */
  readonly theme = computed<Theme>(() => this.chosen() ?? (this.systemDark() ? 'dark' : 'light'));
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    this.apply();
    this.media?.addEventListener('change', (event) => {
      // La classe est posée avant la mise à jour du signal : les graphiques relisent des tokens à jour
      this.systemDark.set(event.matches);
      this.apply();
    });
  }

  toggle(): void {
    const next: Theme = this.isDark() ? 'light' : 'dark';
    this.chosen.set(next);
    this.apply();
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Navigation privée / stockage bloqué : le choix vaut pour la session en cours
    }
  }

  private apply(): void {
    // Calcul direct (pas via le computed) pour poser la classe avant que les abonnés ne relisent les tokens
    const dark = (this.chosen() ?? (this.systemDark() ? 'dark' : 'light')) === 'dark';
    this.root.classList.toggle(DARK_CLASS, dark);
  }
}

function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}
