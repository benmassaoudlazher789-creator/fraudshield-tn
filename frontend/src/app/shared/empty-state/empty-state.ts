import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * État vide illustré (liste sans résultat).
 * Usage : <app-empty-state icon="pi pi-check" title="Aucune alerte" message="…" />
 */
@Component({
  selector: 'app-empty-state',
  template: `
    <div class="art" aria-hidden="true">
      <svg viewBox="0 0 120 96">
        <ellipse class="shadow" cx="60" cy="88" rx="38" ry="5" />
        <rect class="panel" x="20" y="10" width="76" height="66" rx="10" />
        <rect class="line" x="31" y="23" width="38" height="6" rx="3" />
        <rect class="line line--soft" x="31" y="36" width="54" height="6" rx="3" />
        <rect class="line line--soft" x="31" y="49" width="30" height="6" rx="3" />
        <circle class="badge" cx="90" cy="68" r="17" />
      </svg>
      <i [class]="icon()"></i>
    </div>
    <p class="title">{{ title() }}</p>
    @if (message()) {
      <p class="message">{{ message() }}</p>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
      text-align: center;
    }
    :host(.compact) {
      padding: 1.25rem 1rem;
    }
    .art {
      position: relative;
      width: 120px;
      height: 96px;
      margin-bottom: 0.75rem;
    }
    :host(.compact) .art {
      transform: scale(0.8);
      margin-bottom: 0;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .shadow { fill: var(--fs-surface-high); }
    .panel { fill: var(--fs-surface); stroke: var(--fs-border); stroke-width: 1.5; }
    .line { fill: var(--fs-primary-soft); }
    .line--soft { fill: var(--fs-surface-high); }
    .badge { fill: var(--fs-primary); }
    i {
      position: absolute;
      left: 75%;
      top: 70.8%;
      transform: translate(-50%, -50%);
      color: #fff;
      font-size: 0.95rem;
    }
    .title {
      margin: 0;
      font-weight: 600;
      color: var(--fs-text);
    }
    .message {
      max-width: 28rem;
      margin: 0.25rem 0 0;
      font-size: 13px;
      color: var(--fs-text-muted);
    }
  `,
  host: { '[class.compact]': 'compact()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly icon = input('pi pi-inbox');
  readonly compact = input(false);
}
