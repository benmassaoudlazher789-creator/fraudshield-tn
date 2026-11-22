import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Score de risque /100 avec barre colorée : vert < 40, orange < 75, rouge sinon. */
@Component({
  selector: 'app-score-bar',
  template: `
    <span class="value tabular" [class]="level()">{{ clamped() }}/100</span>
    <span
      class="track"
      role="meter"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="clamped()"
      [attr.aria-label]="'Score de risque ' + clamped() + ' sur 100'"
    >
      <span class="fill" [class]="level()" [style.width.%]="clamped()"></span>
    </span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 120px;
    }
    .value {
      flex-shrink: 0;
      width: 52px;
      font-size: 12px;
      font-weight: 700;
    }
    .track {
      flex: 1;
      height: 6px;
      border-radius: 9999px;
      background: var(--fs-surface-high);
      overflow: hidden;
    }
    .fill {
      display: block;
      height: 100%;
      border-radius: 9999px;
    }
    .low { color: var(--fs-success-strong); }
    .medium { color: var(--fs-warning-strong); }
    .high { color: var(--fs-danger-strong); }
    .fill.low { background: var(--fs-chart-success); }
    .fill.medium { background: var(--fs-chart-warning); }
    .fill.high { background: var(--fs-chart-danger); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreBar {
  readonly score = input.required<number | null>();

  protected readonly clamped = computed(() => Math.max(0, Math.min(100, Math.round(this.score() ?? 0))));
  protected readonly level = computed(() => {
    const s = this.clamped();
    return s >= 75 ? 'high' : s >= 40 ? 'medium' : 'low';
  });
}
