import { Pipe, PipeTransform } from '@angular/core';

const time = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const dayMonth = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

/** Date courte et relative : "Aujourd'hui 14:32", "Hier 18:40", "24 mai 11:15". */
export function formatShortDate(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) {
    return `Aujourd'hui ${time.format(date)}`;
  }
  if (sameDay(date, yesterday)) {
    return `Hier ${time.format(date)}`;
  }
  return `${dayMonth.format(date).replace('.', '')} ${time.format(date)}`;
}

/** Usage : {{ transaction.createdAt | shortDate }} */
@Pipe({ name: 'shortDate' })
export class ShortDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatShortDate(value);
  }
}
