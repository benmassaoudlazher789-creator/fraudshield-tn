import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { ChartData, ChartOptions } from 'chart.js';
import { ChartModule } from 'primeng/chart';
import { Subject, Subscription, debounceTime, merge, switchMap, timer, catchError, EMPTY } from 'rxjs';

import { AlertStatus, AlertSummary, Dashboard as DashboardData } from '../../../core/models/analyst.model';
import { DtPipe, formatAmount } from '../../../core/pipes/dt.pipe';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { AnalystService } from '../../../core/services/analyst.service';
import { prefersReducedMotion, readChartColors } from '../../../core/theme/chart-colors';
import { ThemeService } from '../../../core/theme/theme.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { alertRowTone } from '../../../core/utils/alert-tone';
import { AlertBadge } from '../../../shared/alert-badge/alert-badge';
import { CountUp } from '../../../shared/count-up/count-up';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { Flag } from '../../../shared/flag/flag';
import { ScoreBar } from '../../../shared/score-bar/score-bar';
import { Sparkline } from '../../../shared/sparkline/sparkline';

const LIVE_ROWS = 8;
const FRESH_MS = 2500;
const REFRESH_DEBOUNCE_MS = 700;
const REFRESH_INTERVAL_MS = 30000;
/** Points gardés pour les sparklines construites au fil des rafraîchissements. */
const HISTORY_POINTS = 20;

type AlertFilter = 'ALL' | Exclude<AlertStatus, 'TRAITEE'>;

/** Tendance d'un KPI par rapport à la veille à la même heure. */
interface Trend {
  icon: string;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  title: string;
}

const minuteFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const percentFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const integerFormat = new Intl.NumberFormat('fr-FR');

/**
 * Évolution par rapport à la veille.
 * risky : une hausse est une mauvaise nouvelle (alertes, montants bloqués).
 */
function trend(today: number, yesterday: number, risky: boolean, format: (n: number) => string): Trend {
  const title = `Hier à la même heure : ${format(yesterday)}`;
  if (today === yesterday) {
    return { icon: 'pi pi-equals', text: 'stable', tone: 'neutral', title };
  }
  const up = today > yesterday;
  const text =
    yesterday === 0 ? `+${format(today)}` : `${up ? '+' : '−'}${percentFormat.format(Math.abs((today - yesterday) / yesterday) * 100)} %`;
  return {
    icon: up ? 'pi pi-arrow-up-right' : 'pi pi-arrow-down-right',
    text,
    tone: risky ? (up ? 'bad' : 'good') : 'neutral',
    title,
  };
}

/** Tableau de bord analyste : KPI du jour, graphiques et alertes en temps réel. */
@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink, ChartModule, DtPipe, AlertBadge, CountUp, EmptyState, Flag, ScoreBar, Sparkline],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly analystService = inject(AnalystService);
  private readonly realtime = inject(RealtimeService);
  private readonly theme = inject(ThemeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh$ = new Subject<void>();
  private alertsSubscription?: Subscription;

  protected readonly connected = this.realtime.connected;
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly alerts = signal<AlertSummary[]>([]);
  protected readonly fresh = signal<ReadonlySet<number>>(new Set());
  protected readonly loading = signal(true);
  protected readonly alertsLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly formatAmount = formatAmount;
  protected readonly skeletonRows = [0, 1, 2, 3];

  // ---------- Filtres rapides du tableau ----------
  protected readonly filters: { value: AlertFilter; label: string }[] = [
    { value: 'ALL', label: 'Toutes' },
    { value: 'A_VERIFIER', label: 'À vérifier' },
    { value: 'BLOQUEE', label: 'Bloquées' },
  ];
  protected readonly filter = signal<AlertFilter>('ALL');
  protected readonly emptyTitle = computed(() =>
    ({ ALL: 'Aucune alerte pour le moment', A_VERIFIER: 'Aucune alerte à vérifier', BLOQUEE: 'Aucune alerte bloquée' })[
      this.filter()
    ],
  );

  // ---------- Sparklines construites à chaque rafraîchissement (pas d'historique côté API) ----------
  private readonly blockedHistory = signal<number[]>([]);
  private readonly pendingHistory = signal<number[]>([]);

  protected readonly sparks = computed(() => {
    const buckets = this.data()?.perMinute ?? [];
    return {
      transactions: buckets.map((b) => b.total),
      flagged: buckets.map((b) => b.flagged),
      blocked: this.blockedHistory(),
      pending: this.pendingHistory(),
    };
  });

  /** Tendances vs la veille (si le backend fournit les valeurs de la veille). */
  protected readonly trends = computed(() => {
    const d = this.data();
    const y = d?.yesterday;
    if (!d || !y) {
      return null;
    }
    const int = (n: number) => integerFormat.format(n);
    const amount = (n: number) => `${formatAmount(n)} DT`;
    return {
      transactions: trend(d.transactionsToday, y.transactions, false, int),
      alerts: trend(d.alertsToday, y.alerts, true, int),
      blocked: trend(Number(d.blockedAmountToday), Number(y.blockedAmount), true, amount),
    };
  });

  /** Transactions du jour encore en cours de scoring. */
  protected readonly inProgress = computed(() => {
    const d = this.data();
    if (!d) {
      return 0;
    }
    const decided = d.decisions.ACCEPTEE + d.decisions.A_VERIFIER + d.decisions.BLOQUEE;
    return Math.max(0, d.transactionsToday - decided);
  });

  protected readonly alertRate = computed(() => {
    const d = this.data();
    return d && d.transactionsToday > 0 ? (d.alertsToday / d.transactionsToday) * 100 : 0;
  });

  // ---------- Graphiques (couleurs relues à chaque changement de thème) ----------
  private readonly colors = computed(() => {
    this.theme.theme();
    return readChartColors();
  });

  /** Répartition des décisions du jour (en % et en nombre). */
  protected readonly decisionRows = computed(() => {
    const d = this.data()?.decisions;
    const c = this.colors();
    if (!d) {
      return [];
    }
    const total = d.ACCEPTEE + d.A_VERIFIER + d.BLOQUEE;
    const pct = (n: number) => (total ? (n / total) * 100 : 0);
    return [
      { key: 'ACCEPTEE', label: 'Acceptées', count: d.ACCEPTEE, pct: pct(d.ACCEPTEE), color: c.success },
      { key: 'A_VERIFIER', label: 'À vérifier', count: d.A_VERIFIER, pct: pct(d.A_VERIFIER), color: c.warning },
      { key: 'BLOQUEE', label: 'Bloquées', count: d.BLOQUEE, pct: pct(d.BLOQUEE), color: c.danger },
    ];
  });

  protected readonly decidedTotal = computed(() => this.decisionRows().reduce((s, r) => s + r.count, 0));

  protected readonly lineData = computed<ChartData<'line'>>(() => {
    const buckets = this.data()?.perMinute ?? [];
    const c = this.colors();
    return {
      labels: buckets.map((b) => minuteFormat.format(new Date(b.minute))),
      datasets: [
        {
          label: 'Transactions',
          data: buckets.map((b) => b.total),
          borderColor: c.primary,
          backgroundColor: c.primaryFill,
          pointBackgroundColor: c.primary,
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
        {
          label: 'Suspectes (à vérifier / bloquées)',
          data: buckets.map((b) => b.flagged),
          borderColor: c.danger,
          backgroundColor: 'transparent',
          pointBackgroundColor: c.danger,
          borderDash: [5, 4],
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    };
  });

  protected readonly lineOptions = computed<ChartOptions<'line'>>(() => {
    const c = this.colors();
    return {
      maintainAspectRatio: false,
      animation: prefersReducedMotion() ? false : { duration: 300 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', align: 'end', labels: { color: c.text, boxWidth: 12, usePointStyle: true } },
      },
      scales: {
        x: { grid: { display: false }, border: { color: c.grid }, ticks: { color: c.text, maxRotation: 0, autoSkip: true } },
        y: { beginAtZero: true, grid: { color: c.grid }, border: { display: false }, ticks: { color: c.text, precision: 0 } },
      },
    };
  });

  protected readonly donutData = computed<ChartData<'doughnut'>>(() => {
    const rows = this.decisionRows();
    const c = this.colors();
    const empty = this.decidedTotal() === 0;
    return {
      labels: rows.map((r) => r.label),
      datasets: [
        {
          // Anneau gris tant qu'aucune décision n'est prise
          data: empty ? [1] : rows.map((r) => r.count),
          backgroundColor: empty ? [c.grid] : rows.map((r) => r.color),
          borderColor: c.surface,
          borderWidth: empty ? 0 : 2,
        },
      ],
    };
  });

  protected readonly donutOptions = computed<ChartOptions<'doughnut'>>(() => ({
    maintainAspectRatio: false,
    animation: prefersReducedMotion() ? false : undefined,
    cutout: '72%',
    plugins: { legend: { display: false }, tooltip: { enabled: this.decidedTotal() > 0 } },
  }));

  ngOnInit(): void {
    this.loadDashboard();
    this.loadAlerts();

    // Rafraîchissement des KPI : à chaque évènement temps réel (regroupés) et toutes les 30 s
    merge(this.refresh$.pipe(debounceTime(REFRESH_DEBOUNCE_MS)), timer(REFRESH_INTERVAL_MS, REFRESH_INTERVAL_MS))
      .pipe(
        switchMap(() => this.analystService.getDashboard().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => this.setData(data));

    this.realtime.alerts$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((alert) => this.onNewAlert(alert));

    this.realtime.transactions$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((tx) => {
      this.refresh$.next();
      // Décision d'un analyste sur une alerte affichée : on recharge la liste
      if (this.alerts().some((a) => a.transactionId === tx.id && a.analystDecision === null)) {
        this.loadAlerts();
      }
    });
  }

  protected setFilter(value: AlertFilter): void {
    if (value !== this.filter()) {
      this.filter.set(value);
      this.alerts.set([]);
      this.loadAlerts();
    }
  }

  protected readonly rowTone = alertRowTone;

  private setData(data: DashboardData): void {
    this.data.set(data);
    const push = (list: number[], value: number) => [...list, value].slice(-HISTORY_POINTS);
    this.blockedHistory.update((list) => push(list, Number(data.blockedAmountToday)));
    this.pendingHistory.update((list) => push(list, data.pendingReviewCount));
  }

  private loadDashboard(): void {
    this.analystService
      .getDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.setData(data);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Impossible de charger le tableau de bord.'));
        },
      });
  }

  private loadAlerts(): void {
    const filter = this.filter();
    this.alertsLoading.set(true);
    this.alertsSubscription?.unsubscribe();
    this.alertsSubscription = this.analystService
      .getAlerts(0, LIVE_ROWS, filter === 'ALL' ? null : filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.alerts.set(page.content);
          this.alertsLoading.set(false);
        },
        error: () => this.alertsLoading.set(false),
      });
  }

  /** Nouvelle alerte : ajoutée en haut (si elle correspond au filtre) avec une surbrillance, puis KPI rafraîchis. */
  private onNewAlert(alert: AlertSummary): void {
    this.refresh$.next();
    const filter = this.filter();
    if (filter !== 'ALL' && alert.status !== filter) {
      return;
    }
    this.alerts.update((list) => [alert, ...list.filter((a) => a.id !== alert.id)].slice(0, LIVE_ROWS));
    this.fresh.update((set) => new Set(set).add(alert.id));
    setTimeout(() => {
      this.fresh.update((set) => {
        const next = new Set(set);
        next.delete(alert.id);
        return next;
      });
    }, FRESH_MS);
  }
}
