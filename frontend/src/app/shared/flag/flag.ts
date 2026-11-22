import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

import { countryName } from '../../core/models/client.model';

/**
 * Drapeau SVG local de la librairie flag-icons.
 * Les fichiers sont copiés dans /flags au build (assets d'angular.json) : aucun appel réseau externe.
 * Usage : <app-flag [code]="'TN'" />
 */
@Component({
  selector: 'app-flag',
  imports: [NgOptimizedImage],
  template: `
    @if (src(); as url) {
      <img
        [ngSrc]="url"
        width="20"
        height="15"
        [alt]="label()"
        [attr.title]="label()"
        (error)="failed.set(true)"
      />
    } @else {
      <span class="fallback">{{ code() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
    }
    img {
      display: block;
      border-radius: 2px;
      box-shadow: 0 0 0 1px var(--fs-border);
    }
    .fallback {
      font-size: 11px;
      font-weight: 600;
      color: var(--fs-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Flag {
  /** Code pays ISO 3166-1 alpha-2 (ex : "TN"). */
  readonly code = input.required<string>();

  /** Fichier SVG introuvable : on affiche le code à la place. */
  protected readonly failed = signal(false);

  protected readonly src = computed(() => {
    const code = (this.code() ?? '').trim().toLowerCase();
    return /^[a-z]{2}$/.test(code) && !this.failed() ? `flags/${code}.svg` : null;
  });
  protected readonly label = computed(() => countryName((this.code() ?? '').toUpperCase()));
}
