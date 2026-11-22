import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type SparklineTone = 'primary' | 'danger' | 'success' | 'warning';

const W = 100;
const H = 28;

/** Mini-courbe SVG sans axe (tendance). Masquée tant qu'il y a moins de 2 points. */
@Component({
  selector: 'app-sparkline',
  template: `
    @if (paths(); as p) {
      <svg [attr.viewBox]="'0 0 ' + width + ' ' + height" preserveAspectRatio="none" role="img" [attr.aria-label]="label()">
        <path class="area" [attr.d]="p.area" />
        <path class="line" [attr.d]="p.line" />
      </svg>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 28px;
      color: var(--fs-chart-primary);
    }
    :host(.danger) { color: var(--fs-chart-danger); }
    :host(.success) { color: var(--fs-chart-success); }
    :host(.warning) { color: var(--fs-chart-warning); }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .line {
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linejoin: round;
      stroke-linecap: round;
      vector-effect: non-scaling-stroke;
    }
    .area {
      fill: currentColor;
      opacity: 0.12;
    }
  `,
  host: { '[class]': 'tone()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sparkline {
  readonly values = input<readonly number[]>([]);
  readonly tone = input<SparklineTone>('primary');
  readonly label = input('Tendance');

  protected readonly width = W;
  protected readonly height = H;

  protected readonly paths = computed(() => {
    const values = this.values();
    if (values.length < 2) {
      return null;
    }
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      // Marge de 2 unités en haut et en bas ; série plate dessinée au milieu
      const y = max === min ? H / 2 : H - 2 - ((v - min) / range) * (H - 4);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });
    const line = 'M' + points.join(' L');
    // Série plate : simple trait, sans aplat
    return { line, area: max === min ? '' : `${line} L${W},${H} L0,${H} Z` };
  });
}
