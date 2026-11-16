import { Pipe, PipeTransform } from '@angular/core';

const NBSP = ' ';

// Format tunisien : 3 décimales (millimes), virgule décimale, espace pour les milliers
const formatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/** 28450 -> "28 450,000 DT" (espaces insécables pour éviter les retours à la ligne). */
export function formatDt(value: number | string | null | undefined): string {
  const amount = formatAmount(value);
  return amount === '—' ? amount : amount + NBSP + 'DT';
}

/** 28450 -> "28 450,000" (sans suffixe, pour un affichage où "DT" est stylé à part). */
export function formatAmount(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount)) {
    return '—';
  }
  // Intl utilise l'espace fine insécable (U+202F) : on la remplace par une espace insécable classique
  return formatter.format(amount).replace(/[   ]/g, NBSP);
}

/** Usage : {{ montant | dt }} ou {{ montant | dt: false }} pour omettre "DT". */
@Pipe({ name: 'dt' })
export class DtPipe implements PipeTransform {
  transform(value: number | string | null | undefined, withSuffix = true): string {
    return withSuffix ? formatDt(value) : formatAmount(value);
  }
}
