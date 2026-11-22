/** Couleurs des graphiques Chart.js, lues dans les tokens CSS du thème courant (styles.scss). */
export interface ChartColors {
  primary: string;
  primaryFill: string;
  danger: string;
  success: string;
  warning: string;
  soft: string;
  neutral: string;
  neutral2: string;
  grid: string;
  text: string;
  surface: string;
}

export function readChartColors(): ChartColors {
  const style = getComputedStyle(document.documentElement);
  const token = (name: string) => style.getPropertyValue(`--fs-${name}`).trim();
  return {
    primary: token('chart-primary'),
    primaryFill: token('chart-primary-fill'),
    danger: token('chart-danger'),
    success: token('chart-success'),
    warning: token('chart-warning'),
    soft: token('chart-soft'),
    neutral: token('chart-neutral'),
    neutral2: token('chart-neutral-2'),
    grid: token('chart-grid'),
    text: token('chart-text'),
    surface: token('surface'),
  };
}

/** Vrai si l'utilisateur a demandé de réduire les animations. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
