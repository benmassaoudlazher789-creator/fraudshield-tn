import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
  untracked,
} from '@angular/core';

import { prefersReducedMotion } from '../../core/theme/chart-colors';

const integer = new Intl.NumberFormat('fr-FR');
const DURATION_MS = 700;

/**
 * Nombre animé de la valeur précédente vers la nouvelle (ease-out).
 * Affichage direct si prefers-reduced-motion. "—" tant que la valeur est nulle.
 * Usage : <app-count-up [value]="n" [format]="formatAmount" />
 */
@Component({
  selector: 'app-count-up',
  template: '{{ text() }}',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountUp {
  readonly value = input<number | null | undefined>(null);
  readonly format = input<(value: number) => string>((n) => integer.format(Math.round(n)));

  private readonly shown = signal<number | null>(null);
  protected readonly text = computed(() => {
    const value = this.shown();
    return value === null ? '—' : this.format()(value);
  });

  constructor() {
    effect((onCleanup) => {
      const target = this.value();
      if (target === null || target === undefined || !Number.isFinite(target)) {
        this.shown.set(null);
        return;
      }
      const from = untracked(this.shown) ?? 0;
      if (from === target || prefersReducedMotion() || typeof requestAnimationFrame !== 'function') {
        this.shown.set(target);
        return;
      }
      const start = performance.now();
      let frame = 0;
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / DURATION_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        this.shown.set(t < 1 ? from + (target - from) * eased : target);
        if (t < 1) {
          frame = requestAnimationFrame(step);
        }
      };
      frame = requestAnimationFrame(step);
      onCleanup(() => cancelAnimationFrame(frame));
    });
  }
}
