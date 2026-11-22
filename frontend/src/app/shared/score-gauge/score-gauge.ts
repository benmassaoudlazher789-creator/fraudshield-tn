import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Arc de 270° ouvert vers le bas. */
const ARC = CIRCUMFERENCE * 0.75;

/** Jauge circulaire du score de risque /100 : vert < 40, orange < 75, rouge sinon. */
@Component({
  selector: 'app-score-gauge',
  template: `
    <div
      class="gauge"
      role="meter"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="clamped()"
      [attr.aria-valuetext]="clamped() + ' sur 100, risque ' + levelLabel()"
      aria-label="Score de risque"
    >
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle class="track" cx="60" cy="60" [attr.r]="radius" [attr.stroke-dasharray]="arc + ' ' + circumference" />
        <circle
          class="value"
          cx="60"
          cy="60"
          [attr.r]="radius"
          [attr.stroke-dasharray]="arc + ' ' + circumference"
          [style.stroke-dashoffset]="drawn() ? offset() : arc"
        />
      </svg>
      <div class="center">
        <strong class="tabular">{{ clamped() }}</strong>
        <span>/100</span>
      </div>
      <span class="level">{{ levelLabel() }}</span>
    </div>
  `,
  styles: `
    :host {
      display: inline-block;
      --gauge-color: var(--fs-chart-success);
    }
    :host(.medium) { --gauge-color: var(--fs-chart-warning); }
    :host(.high) { --gauge-color: var(--fs-chart-danger); }
    .gauge {
      position: relative;
      width: 132px;
      height: 132px;
    }
    svg {
      width: 100%;
      height: 100%;
      transform: rotate(135deg);
    }
    circle {
      fill: none;
      stroke-width: 10;
      stroke-linecap: round;
    }
    .track { stroke: var(--fs-surface-high); }
    .value {
      stroke: var(--gauge-color);
      transition: stroke-dashoffset 0.9s cubic-bezier(0.22, 1, 0.36, 1);
    }
    .center {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: baseline;
      justify-content: center;
      padding-top: 44px;
      gap: 0.125rem;
    }
    strong {
      font-size: 36px;
      line-height: 40px;
      font-weight: 700;
      letter-spacing: -0.03em;
    }
    .center span {
      font-size: 13px;
      font-weight: 600;
      color: var(--fs-text-muted);
    }
    .level {
      position: absolute;
      left: 50%;
      bottom: 6px;
      transform: translateX(-50%);
      padding: 0.0625rem 0.5rem;
      border-radius: 9999px;
      background: var(--fs-surface);
      box-shadow: 0 0 0 1px var(--fs-border);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    :host(.low) .level { color: var(--fs-success-strong); }
    :host(.medium) .level { color: var(--fs-warning-strong); }
    :host(.high) .level { color: var(--fs-danger-strong); }
  `,
  host: { '[class]': 'level()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScoreGauge {
  readonly score = input.required<number | null>();

  protected readonly radius = RADIUS;
  protected readonly circumference = CIRCUMFERENCE;
  protected readonly arc = ARC;

  /** Faux au premier rendu : l'arc se remplit ensuite via la transition CSS. */
  protected readonly drawn = signal(false);

  protected readonly clamped = computed(() => Math.max(0, Math.min(100, Math.round(this.score() ?? 0))));
  protected readonly offset = computed(() => ARC * (1 - this.clamped() / 100));
  protected readonly level = computed(() => {
    const s = this.clamped();
    return s >= 75 ? 'high' : s >= 40 ? 'medium' : 'low';
  });
  protected readonly levelLabel = computed(
    () => ({ high: 'élevé', medium: 'modéré', low: 'faible' })[this.level()],
  );

  constructor() {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => requestAnimationFrame(() => this.drawn.set(true)));
    } else {
      this.drawn.set(true);
    }
  }
}
