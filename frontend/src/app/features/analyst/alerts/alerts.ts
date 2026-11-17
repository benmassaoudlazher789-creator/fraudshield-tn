import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';

import { AlertStatus, AlertSummary } from '../../../core/models/analyst.model';
import { DtPipe } from '../../../core/pipes/dt.pipe';
import { RealtimeService } from '../../../core/realtime/realtime.service';
import { AnalystService } from '../../../core/services/analyst.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { AlertBadge } from '../../../shared/alert-badge/alert-badge';
import { Flag } from '../../../shared/flag/flag';
import { ScoreBar } from '../../../shared/score-bar/score-bar';

type StatusFilter = AlertStatus | 'ALL';

const VALID_STATUSES: AlertStatus[] = ['A_VERIFIER', 'BLOQUEE', 'TRAITEE'];

/** Page /analyste/alertes : liste paginée (côté serveur) avec filtre par statut. */
@Component({
  selector: 'app-alerts',
  imports: [DatePipe, FormsModule, RouterLink, SelectButtonModule, TableModule, DtPipe, AlertBadge, Flag, ScoreBar],
  templateUrl: './alerts.html',
  styleUrl: './alerts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Alerts implements OnInit {
  private readonly analystService = inject(AnalystService);
  private readonly realtime = inject(RealtimeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private loadSubscription?: Subscription;

  /** Filtre initial depuis l'URL (?status=A_VERIFIER), lié par withComponentInputBinding. */
  readonly status = input<string>();

  protected readonly filterOptions: { label: string; value: StatusFilter }[] = [
    { label: 'Toutes', value: 'ALL' },
    { label: 'À vérifier', value: 'A_VERIFIER' },
    { label: 'Bloquées', value: 'BLOQUEE' },
    { label: 'Traitées', value: 'TRAITEE' },
  ];

  protected readonly filter = signal<StatusFilter>('ALL');
  protected readonly alerts = signal<AlertSummary[]>([]);
  protected readonly total = signal(0);
  protected readonly first = signal(0);
  protected readonly rows = signal(20);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const initial = this.status() as AlertStatus | undefined;
    if (initial && VALID_STATUSES.includes(initial)) {
      this.filter.set(initial);
    }
    // Nouvelle alerte : la première page est rechargée
    this.realtime.alerts$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.first() === 0) {
        this.load();
      }
    });
  }

  /** Appelé par p-table au démarrage et à chaque changement de page. */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.first.set(event.first ?? 0);
    this.rows.set(event.rows ?? this.rows());
    this.load();
  }

  protected onFilterChange(value: StatusFilter | null): void {
    this.filter.set(value ?? 'ALL');
    this.first.set(0);
    // Le filtre est reflété dans l'URL (partage de lien, retour arrière)
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: value && value !== 'ALL' ? value : null },
      replaceUrl: true,
    });
    this.load();
  }

  protected openAlert(alert: AlertSummary): void {
    void this.router.navigate(['/analyste/alertes', alert.id]);
  }

  private load(): void {
    const filter = this.filter();
    const page = Math.floor(this.first() / this.rows());
    this.loading.set(true);
    this.error.set(null);
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = this.analystService
      .getAlerts(page, this.rows(), filter === 'ALL' ? null : filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.alerts.set(result.content);
          this.total.set(result.totalElements);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Impossible de charger les alertes.'));
        },
      });
  }
}
