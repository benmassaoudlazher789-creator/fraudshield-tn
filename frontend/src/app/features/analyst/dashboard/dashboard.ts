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
import { Subject, debounceTime, merge, switchMap, timer, catchError, EMPTY } from 'rxjs';

import { AlertSummary, Dashboard as DashboardData } from '../../../core/models/analyst.model';
import { DtPipe } from '../../../core/pipes/dt.pipe';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { AnalystService } from '../../../core/services/analyst.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { AlertBadge } from '../../../shared/alert-badge/alert-badge';
import { Flag } from '../../../shared/flag/flag';
import { ScoreBar } from '../../../shared/score-bar/score-bar';

const LIVE_ROWS = 8;
const FRESH_MS = 2500;
const REFRESH_DEBOUNCE_MS = 700;
const REFRESH_INTERVAL_MS = 30000;

const COLORS = {
  primary: '#1e3a8a',
  primaryFill: 'rgba(30, 58, 138, 0.10)',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  grid: '#eef2f7',
  text: '#64748b',
};

const minuteFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** Tableau de bord analyste : KPI du jour, graphiques et alertes en temps réel. */
@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink, ChartModule, DtPipe, AlertBadge, Flag, ScoreBar],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard implements OnInit {
  private readonly analystService = inject(AnalystService);
  private readonly realtime = inject(RealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly refresh$ = new Subject<void>();

  protected readonly connected = this.realtime.connected;
  protected readonly data = signal<DashboardData | null>(null);
  protected readonly alerts = signal<AlertSummary[]>([]);
  protected readonly fresh = signal<ReadonlySet<number>>(new Set());
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

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

  /** Répartition des décisions du jour (en % et en nombre). */
  protected readonly decisionRows = computed(() => {
    const d = this.data()?.decisions;
    if (!d) {
      return [];
    }
    const total = d.ACCEPTEE + d.A_VERIFIER + d.BLOQUEE;
    const pct = (n: number) => (total ? (n / total) * 100 : 0);
    return [
      { key: 'ACCEPTEE', label: 'Acceptées', count: d.ACCEPTEE, pct: pct(d.ACCEPTEE), color: COLORS.success },
      { key: 'A_VERIFIER', label: 'À vérifier', count: d.A_VERIFIER, pct: pct(d.A_VERIFIER), color: COLORS.warning },
      { key: 'BLOQUEE', label: 'Bloquées', count: d.BLOQUEE, pct: pct(d.BLOQUEE), color: COLORS.danger },
    ];
  });

  protected readonly decidedTotal = computed(() => this.decisionRows().reduce((s, r) => s + r.count, 0));

  protected readonly lineData = computed<ChartData<'line'>>(() => {
    const buckets = this.data()?.perMinute ?? [];
    return {
      labels: buckets.map((b) => minuteFormat.format(new Date(b.minute))),
      datasets: [
        {
          label: 'Transactions',
          data: buckets.map((b) => b.total),
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primaryFill,
          fill: true,
          tension: 0.35,
          pointRadius: 2,
        },
        {
          label: 'Suspectes (à vérifier / bloquées)',
          data: buckets.map((b) => b.flagged),
          borderColor: COLORS.danger,
          backgroundColor: 'transparent',
          borderDash: [5, 4],
          tension: 0.35,
          pointRadius: 2,
        },
      ],
    };
  });

  protected readonly lineOptions: ChartOptions<'line'> = {
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', align: 'end', labels: { color: COLORS.text, boxWidth: 12, usePointStyle: true } },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: COLORS.text, maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { color: COLORS.text, precision: 0 } },
    },
  };

  protected readonly donutData = computed<ChartData<'doughnut'>>(() => {
    const rows = this.decisionRows();
    return {
      labels: rows.map((r) => r.label),
      datasets: [
        {
          data: rows.map((r) => r.count),
          backgroundColor: rows.map((r) => r.color),
          borderWidth: 0,
        },
      ],
    };
  });

  protected readonly donutOptions: ChartOptions<'doughnut'> = {
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: { legend: { display: false } },
  };

  ngOnInit(): void {
    this.loadDashboard();
    this.loadAlerts();

    // Rafraîchissement des KPI : à chaque évènement temps réel (regroupés) et toutes les 30 s
    merge(this.refresh$.pipe(debounceTime(REFRESH_DEBOUNCE_MS)), timer(REFRESH_INTERVAL_MS, REFRESH_INTERVAL_MS))
      .pipe(
        switchMap(() => this.analystService.getDashboard().pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => this.data.set(data));

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

  private loadDashboard(): void {
    this.analystService
      .getDashboard()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.data.set(data);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Impossible de charger le tableau de bord.'));
        },
      });
  }

  private loadAlerts(): void {
    this.analystService
      .getAlerts(0, LIVE_ROWS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (page) => this.alerts.set(page.content), error: () => undefined });
  }

  /** Nouvelle alerte : ajoutée en haut avec une animation, puis KPI rafraîchis. */
  private onNewAlert(alert: AlertSummary): void {
    this.alerts.update((list) => [alert, ...list.filter((a) => a.id !== alert.id)].slice(0, LIVE_ROWS));
    this.fresh.update((set) => new Set(set).add(alert.id));
    setTimeout(() => {
      this.fresh.update((set) => {
        const next = new Set(set);
        next.delete(alert.id);
        return next;
      });
    }, FRESH_MS);
    this.refresh$.next();
  }
}
