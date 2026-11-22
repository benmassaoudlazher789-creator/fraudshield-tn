import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Popover, PopoverModule } from 'primeng/popover';
import { ToastModule } from 'primeng/toast';
import { bufferTime, filter } from 'rxjs';

import { AlertSummary } from '../../core/models/analyst.model';
import { DtPipe, formatDt } from '../../core/pipes/dt.pipe';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { AlertBadge } from '../../shared/alert-badge/alert-badge';
import { EmptyState } from '../../shared/empty-state/empty-state';

/** Alertes gardées dans la liste de la cloche. */
const MAX_RECENT = 8;
/** Les alertes bloquées arrivant en rafale sont regroupées dans un seul toast. */
const TOAST_BUFFER_MS = 1500;
const TOAST_KEY = 'alerts';

interface ToastData {
  link: (string | number)[];
  queryParams?: Record<string, string>;
}

/**
 * Notifications temps réel des rôles ANALYSTE / ADMIN :
 * - toast discret à chaque alerte BLOQUEE (regroupé si plusieurs arrivent ensemble)
 * - cloche avec compteur des alertes non lues, remis à zéro à l'ouverture de la liste
 */
@Component({
  selector: 'app-notification-bell',
  imports: [DatePipe, RouterLink, PopoverModule, ToastModule, DtPipe, AlertBadge, EmptyState],
  providers: [MessageService],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBell {
  private readonly realtime = inject(RealtimeService);
  private readonly messages = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly toastKey = TOAST_KEY;
  protected readonly unread = signal(0);
  protected readonly recent = signal<AlertSummary[]>([]);
  protected readonly open = signal(false);
  /** Nombre d'alertes non lues au moment de l'ouverture (mises en évidence dans la liste). */
  protected readonly highlighted = signal(0);

  protected readonly badgeText = computed(() => (this.unread() > 9 ? '9+' : String(this.unread())));
  protected readonly buttonLabel = computed(() => {
    const n = this.unread();
    return n === 0
      ? 'Notifications, aucune nouvelle alerte'
      : `Notifications, ${n} nouvelle${n > 1 ? 's' : ''} alerte${n > 1 ? 's' : ''}`;
  });

  constructor() {
    const alerts$ = this.realtime.alerts$.pipe(takeUntilDestroyed());

    alerts$.subscribe((alert) => {
      this.recent.update((list) => [alert, ...list.filter((a) => a.id !== alert.id)].slice(0, MAX_RECENT));
      if (this.open()) {
        // Liste ouverte : l'alerte est vue immédiatement
        this.highlighted.update((n) => Math.min(MAX_RECENT, n + 1));
      } else {
        this.unread.update((n) => n + 1);
      }
    });

    alerts$
      .pipe(
        filter((alert) => alert.decision === 'BLOQUEE'),
        bufferTime(TOAST_BUFFER_MS),
        filter((batch) => batch.length > 0),
      )
      .subscribe((batch) => this.toast(batch));
  }

  protected onShow(): void {
    this.open.set(true);
    this.highlighted.set(Math.min(this.unread(), MAX_RECENT));
    this.unread.set(0);
  }

  protected onHide(): void {
    this.open.set(false);
    this.highlighted.set(0);
  }

  protected close(popover: Popover): void {
    popover.hide();
  }

  /** Bouton "Voir" d'un toast : ouvre l'alerte (ou la liste filtrée) et ferme les toasts. */
  protected openToast(data: ToastData): void {
    void this.router.navigate(data.link, { queryParams: data.queryParams });
    this.messages.clear(TOAST_KEY);
  }

  private toast(batch: AlertSummary[]): void {
    const [first] = batch;
    const single = batch.length === 1;
    this.messages.add({
      key: TOAST_KEY,
      severity: 'error',
      summary: single ? `Alerte #${first.id} bloquée` : `${batch.length} alertes bloquées`,
      detail: single
        ? `${first.clientName} · ${formatDt(first.amount)} · score ${first.score}/100`
        : 'Transactions bloquées automatiquement par le moteur anti-fraude',
      life: 6000,
      data: (single
        ? { link: ['/analyste/alertes', first.id] }
        : { link: ['/analyste/alertes'], queryParams: { status: 'BLOQUEE' } }) satisfies ToastData,
    });
  }
}
