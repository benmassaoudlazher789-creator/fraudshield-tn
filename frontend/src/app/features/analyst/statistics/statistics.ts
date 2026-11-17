import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import type { ChartData, ChartOptions } from 'chart.js';
import { ChartModule } from 'primeng/chart';
import { SelectButtonModule } from 'primeng/selectbutton';
import { EMPTY, Subject, catchError, finalize, switchMap } from 'rxjs';

import { Statistics as StatisticsData, StatisticsDays } from '../../../core/models/analyst.model';
import { TransactionType, countryName } from '../../../core/models/client.model';
import { DtPipe } from '../../../core/pipes/dt.pipe';
import { AnalystService } from '../../../core/services/analyst.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { Flag } from '../../../shared/flag/flag';

const COLORS = {
  primary: '#1e3a8a',
  primaryFill: 'rgba(30, 58, 138, 0.10)',
  danger: '#ba1a1a',
  dangerSoft: '#d94b4b',
  confirmed: '#1e3a8a',
  falsePositive: '#b6c4ff',
  grid: '#eef2f7',
  text: '#64748b',
};

/** Barres du top pays : du rouge (1er) au gris (5e), comme la maquette. */
const COUNTRY_COLORS = ['#ba1a1a', '#d94b4b', '#1e3a8a', '#565e74', '#8a91a5'];

const TYPE_VIEW: Record<TransactionType, { label: string; icon: string }> = {
  PAYMENT: { label: 'Paiements', icon: 'pi pi-credit-card' },
  TRANSFER: { label: 'Virements', icon: 'pi pi-send' },
  CASH_OUT: { label: 'Retraits (cash-out)', icon: 'pi pi-wallet' },
};

const integer = new Intl.NumberFormat('fr-FR');
const percent = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ratio = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });

/** "2026-11-17" -> date locale (sans décalage de fuseau horaire). */
function parseDay(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 165 -> { main: '2', mainUnit: 'm', rest: '45', restUnit: 's' } pour l'affichage "2m 45s". */
function splitDuration(seconds: number): { main: string; mainUnit: string; rest: string; restUnit: string } {
  if (seconds >= 3600) {
    return {
      main: String(Math.floor(seconds / 3600)),
      mainUnit: 'h',
      rest: String(Math.floor((seconds % 3600) / 60)).padStart(2, '0'),
      restUnit: 'min',
    };
  }
  return {
    main: String(Math.floor(seconds / 60)),
    mainUnit: 'm',
    rest: String(seconds % 60).padStart(2, '0'),
    restUnit: 's',
  };
}

/** Page /analyste/statistiques : tendances des fraudes et performance du modèle. */
@Component({
  selector: 'app-statistics',
  imports: [FormsModule, ChartModule, SelectButtonModule, DtPipe, Flag],
  templateUrl: './statistics.html',
  styleUrl: './statistics.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Statistics {
  private readonly analystService = inject(AnalystService);
  private readonly days$ = new Subject<StatisticsDays>();

  protected readonly periodOptions: { label: string; value: StatisticsDays }[] = [
    { label: '7 jours', value: 7 },
    { label: '30 jours', value: 30 },
  ];

  protected readonly days = signal<StatisticsDays>(7);
  protected readonly stats = signal<StatisticsData | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  // ---------- Indicateurs ----------
  protected readonly alertsText = computed(() => {
    const s = this.stats()?.summary;
    return s ? integer.format(s.alerts) : '—';
  });

  protected readonly alertsDelta = computed(() => {
    const s = this.stats()?.summary;
    if (!s || s.previousAlerts === 0) {
      return null;
    }
    const delta = ((s.alerts - s.previousAlerts) / s.previousAlerts) * 100;
    return { up: delta > 0, text: `${percent.format(Math.abs(delta))} %` };
  });

  protected readonly decisions = computed(() => {
    const d = this.stats()?.analystDecisions ?? { fraudConfirmed: 0, falsePositive: 0 };
    const total = d.fraudConfirmed + d.falsePositive;
    const pct = (n: number) => (total ? (n / total) * 100 : 0);
    return {
      confirmed: d.fraudConfirmed,
      falsePositive: d.falsePositive,
      total,
      confirmedPct: percent.format(pct(d.fraudConfirmed)),
      falsePositivePct: percent.format(pct(d.falsePositive)),
      confirmedRound: Math.round(pct(d.fraudConfirmed)),
    };
  });

  protected readonly avgDecision = computed(() => {
    const seconds = this.stats()?.summary.avgDecisionSeconds;
    return seconds === null || seconds === undefined ? null : splitDuration(seconds);
  });

  // ---------- Évolution par jour ----------
  protected readonly totalFrauds = computed(() =>
    (this.stats()?.fraudsPerDay ?? []).reduce((sum, d) => sum + d.total, 0),
  );

  protected readonly lineData = computed<ChartData<'line'>>(() => {
    const days = this.stats()?.fraudsPerDay ?? [];
    return {
      labels: days.map((d) => dayFormat.format(parseDay(d.date)).replace('.', '')),
      datasets: [
        {
          label: 'Fraudes détectées',
          data: days.map((d) => d.total),
          borderColor: COLORS.primary,
          backgroundColor: COLORS.primaryFill,
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#fff',
          pointBorderWidth: 2,
        },
        {
          label: 'Dont bloquées',
          data: days.map((d) => d.blocked),
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
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { color: COLORS.text, maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true, grid: { color: COLORS.grid }, ticks: { color: COLORS.text, precision: 0 } },
    },
  };

  // ---------- Par type ----------
  protected readonly typeRows = computed(() => {
    const types = this.stats()?.fraudsByType ?? [];
    const totalCount = types.reduce((s, t) => s + t.count, 0);
    return types.map((t) => {
      const pct = totalCount ? (t.count / totalCount) * 100 : 0;
      return {
        type: t.type,
        ...TYPE_VIEW[t.type],
        count: t.count,
        amount: t.amount,
        pct,
        pctText: `${Math.round(pct)} %`,
        average: t.count ? t.amount / t.count : null,
      };
    });
  });

  protected readonly typeTotalAmount = computed(() =>
    (this.stats()?.fraudsByType ?? []).reduce((s, t) => s + t.amount, 0),
  );

  // ---------- Top pays ----------
  protected readonly countryRows = computed(() => {
    const countries = this.stats()?.topCountries ?? [];
    const max = Math.max(1, ...countries.map((c) => c.count));
    return countries.map((c, i) => ({
      ...c,
      name: countryName(c.country),
      width: (c.count / max) * 100,
      color: COUNTRY_COLORS[i] ?? COUNTRY_COLORS[COUNTRY_COLORS.length - 1],
    }));
  });

  // ---------- Modèle ----------
  protected readonly metrics = computed(() => {
    const m = this.stats()?.modelMetrics;
    if (!m) {
      return null;
    }
    const tile = (label: string, value: number | null) => ({
      label,
      text: value === null ? '—' : ratio.format(value),
      width: value === null ? 0 : Math.max(0, Math.min(1, value)) * 100,
    });
    const cm = m.confusionMatrix;
    return {
      model: m.model ?? 'XGBoost',
      tiles: [
        tile('Précision', m.precision),
        tile('Rappel', m.recall),
        tile('F1-Score', m.f1),
        tile('AUC-PR', m.aucPr),
      ],
      matrix: cm
        ? {
            tp: integer.format(cm.tp),
            fn: integer.format(cm.fn),
            fp: integer.format(cm.fp),
            tn: integer.format(cm.tn),
            interception: cm.tp + cm.fn ? `${percent.format((cm.tp / (cm.tp + cm.fn)) * 100)} %` : '—',
          }
        : null,
      sample: m.testSize !== null ? integer.format(m.testSize) : null,
      threshold: m.threshold !== null ? ratio.format(m.threshold) : null,
      models: (m.models ?? []).map((row) => ({
        name: row.name,
        precision: ratio.format(row.precision),
        recall: ratio.format(row.recall),
        f1: ratio.format(row.f1),
        aucPr: ratio.format(row.aucPr),
        best: row.name === m.model,
      })),
    };
  });

  // ---------- Décisions des analystes ----------
  protected readonly donutData = computed<ChartData<'doughnut'>>(() => {
    const d = this.decisions();
    const empty = d.total === 0;
    return {
      labels: ['Fraudes confirmées', 'Faux positifs'],
      datasets: [
        {
          data: empty ? [0, 1] : [d.confirmed, d.falsePositive],
          backgroundColor: empty ? [COLORS.grid, COLORS.grid] : [COLORS.confirmed, COLORS.falsePositive],
          borderWidth: 0,
        },
      ],
    };
  });

  protected readonly donutOptions: ChartOptions<'doughnut'> = {
    maintainAspectRatio: false,
    cutout: '74%',
    plugins: { legend: { display: false }, tooltip: { enabled: true } },
  };

  constructor() {
    this.days$
      .pipe(
        switchMap((days) => {
          this.loading.set(true);
          this.error.set(null);
          return this.analystService.getStatistics(days).pipe(
            catchError((err: unknown) => {
              this.error.set(apiErrorMessage(err, 'Impossible de charger les statistiques.'));
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((stats) => this.stats.set(stats));

    // Premier chargement (l'abonnement ci-dessus est déjà actif)
    this.days$.next(this.days());
  }

  protected onPeriodChange(days: StatisticsDays | null): void {
    if (days && days !== this.days()) {
      this.days.set(days);
      this.days$.next(days);
    }
  }

  protected formatInt(value: number): string {
    return integer.format(value);
  }
}
