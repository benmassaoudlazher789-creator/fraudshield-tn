import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';

import { AlertDetail, AlertReason, AnalystDecision, TransactionInfo } from '../../../core/models/analyst.model';
import { TYPE_LABELS, TransactionType, countryName } from '../../../core/models/client.model';
import { DtPipe, formatDt } from '../../../core/pipes/dt.pipe';
import { AnalystService } from '../../../core/services/analyst.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { AlertBadge } from '../../../shared/alert-badge/alert-badge';
import { ClientTimeline } from '../../../shared/client-timeline/client-timeline';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { Flag } from '../../../shared/flag/flag';
import { ScoreGauge } from '../../../shared/score-gauge/score-gauge';
import { StatusBadge } from '../../../shared/status-badge/status-badge';

/** Raison préparée pour l'affichage (barre horizontale). */
interface ReasonView {
  label: string;
  source: 'MODELE' | 'REGLE';
  increases: boolean;
  width: number;
  valueText: string | null;
  impactText: string;
}

interface Feedback {
  severity: 'success' | 'error';
  text: string;
}

const DECISION_LABELS: Record<AnalystDecision, string> = {
  FRAUDE_CONFIRMEE: 'Fraude confirmée',
  FAUX_POSITIF: 'Faux positif',
};

const numberFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 });
const impactFormat = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'always',
});

/** Refuse un commentaire composé uniquement d'espaces. */
function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value && !control.value.trim() ? { required: true } : null;
}

/** Page /analyste/alertes/:id : investigation et décision de l'analyste. */
@Component({
  selector: 'app-alert-detail',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    MessageModule,
    TextareaModule,
    DtPipe,
    AlertBadge,
    ClientTimeline,
    EmptyState,
    Flag,
    ScoreGauge,
    StatusBadge,
  ],
  templateUrl: './alert-detail.html',
  styleUrl: './alert-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertDetailPage {
  private readonly analystService = inject(AnalystService);
  private readonly destroyRef = inject(DestroyRef);

  /** Paramètre de route :id (withComponentInputBinding). */
  readonly id = input.required<string>();

  protected readonly detail = signal<AlertDetail | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly feedback = signal<Feedback | null>(null);
  protected readonly dialogVisible = signal(false);
  protected readonly pendingDecision = signal<AnalystDecision | null>(null);

  protected readonly comment = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(2000), notBlank],
  });

  protected readonly quickReasons = [
    'Client injoignable',
    'Fraude confirmée par téléphone',
    'Opération confirmée par le client',
    'Compte piraté / SIM swap',
  ];

  protected readonly decisionLabels = DECISION_LABELS;
  protected readonly countryName = countryName;
  protected readonly typeLabel = (type: TransactionType) => TYPE_LABELS[type];

  protected readonly decided = computed(() => this.detail()?.analystDecision != null);

  protected readonly scoreLevel = computed(() => {
    const score = this.detail()?.score ?? 0;
    return score >= 75 ? 'high' : score >= 40 ? 'medium' : 'low';
  });

  /** Transaction en alerte suivie des 6 précédentes du client. */
  protected readonly history = computed<TransactionInfo[]>(() => {
    const d = this.detail();
    return d ? [d.transaction, ...d.recentTransactions] : [];
  });

  /** Raisons triées : règles d'abord, puis explications du modèle par impact décroissant. */
  protected readonly reasons = computed<ReasonView[]>(() => {
    const reasons = this.detail()?.reasons ?? [];
    const maxImpact = Math.max(
      1e-6,
      ...reasons.filter((r) => r.source === 'MODELE').map((r) => Math.abs(r.impact ?? 0)),
    );
    return [...reasons]
      .sort((a, b) => sortKey(b) - sortKey(a))
      .map((r) => toView(r, maxImpact));
  });

  protected readonly dialogTitle = computed(() =>
    this.pendingDecision() === 'FRAUDE_CONFIRMEE' ? 'Confirmer la fraude ?' : 'Déclarer un faux positif ?',
  );

  protected readonly dialogText = computed(() => {
    const tx = this.detail()?.transaction;
    if (!tx) {
      return '';
    }
    return this.pendingDecision() === 'FRAUDE_CONFIRMEE'
      ? `La transaction #${tx.id} de ${formatDt(tx.amount)} restera bloquée définitivement.`
      : `La transaction #${tx.id} sera acceptée et le compte du client débité de ${formatDt(tx.amount)}.`;
  });

  constructor() {
    // Rechargement si l'identifiant de la route change
    toObservable(this.id)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.loadError.set(null);
          this.feedback.set(null);
        }),
        switchMap((id) =>
          this.analystService.getAlert(Number(id)).pipe(
            catchError((err: unknown) => {
              this.loadError.set(
                err instanceof HttpErrorResponse && err.status === 404
                  ? `L'alerte #${id} n'existe pas.`
                  : apiErrorMessage(err, "Impossible de charger l'alerte."),
              );
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((detail) => {
        this.loading.set(false);
        if (detail) {
          this.setDetail(detail);
        }
      });
  }

  protected addQuickReason(reason: string): void {
    const current = this.comment.value.trim();
    this.comment.setValue(current ? `${current} — ${reason}` : reason);
    this.comment.markAsDirty();
  }

  /** Ouvre la modale de confirmation. */
  protected askDecision(decision: AnalystDecision): void {
    if (this.comment.invalid) {
      this.comment.markAsTouched();
      return;
    }
    this.pendingDecision.set(decision);
    this.dialogVisible.set(true);
  }

  protected confirmDecision(): void {
    const decision = this.pendingDecision();
    const detail = this.detail();
    this.dialogVisible.set(false);
    if (!decision || !detail) {
      return;
    }
    this.submitting.set(true);
    this.feedback.set(null);

    this.analystService
      .decide(detail.id, { decision, comment: this.comment.value.trim() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.submitting.set(false);
          this.setDetail(updated);
          this.feedback.set({
            severity: 'success',
            text: `Décision enregistrée : ${DECISION_LABELS[decision]}. La transaction est désormais ${
              decision === 'FRAUDE_CONFIRMEE' ? 'bloquée' : 'acceptée'
            }.`,
          });
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.feedback.set({
            severity: 'error',
            text: apiErrorMessage(err, "La décision n'a pas pu être enregistrée."),
          });
          // 409 : un autre analyste a déjà décidé, on affiche l'état à jour
          if (err instanceof HttpErrorResponse && err.status === 409) {
            this.reload(detail.id);
          }
        },
      });
  }

  private reload(id: number): void {
    this.analystService
      .getAlert(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (d) => this.setDetail(d), error: () => undefined });
  }

  /** Met à jour le détail et (dés)active la zone de décision. */
  private setDetail(detail: AlertDetail): void {
    this.detail.set(detail);
    if (detail.analystDecision) {
      this.comment.setValue(detail.analystComment ?? '');
      this.comment.disable();
    } else {
      this.comment.enable();
    }
  }
}

/** Règles en premier (poids 1000 + score), puis modèle par impact absolu. */
function sortKey(r: AlertReason): number {
  return r.source === 'REGLE' ? 1000 + (r.score ?? 100) : Math.abs(r.impact ?? 0);
}

function toView(r: AlertReason, maxImpact: number): ReasonView {
  if (r.source === 'REGLE') {
    return {
      label: r.label,
      source: 'REGLE',
      increases: true,
      width: r.score ?? 100,
      valueText: formatReasonValue(r),
      impactText: r.score != null ? `Score règle ${r.score}/100` : 'Règle bloquante',
    };
  }
  const impact = r.impact ?? 0;
  return {
    label: r.label,
    source: 'MODELE',
    increases: impact > 0,
    width: Math.max(4, (Math.abs(impact) / maxImpact) * 100),
    valueText: formatReasonValue(r),
    impactText: `Impact ${impactFormat.format(impact)}`,
  };
}

/** Valeur lisible : montants en DT, nombre de transactions pour la vélocité. */
function formatReasonValue(r: AlertReason): string | null {
  const value = r.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value !== 'number') {
    return String(value);
  }
  if (r.feature === 'VELOCITY_10_MIN') {
    return `${value} transactions en 10 min`;
  }
  if (r.feature === 'MAX_AMOUNT_NEW_COUNTRY' || r.feature === 'SOLDE_INSUFFISANT' || /amount|balance/i.test(r.feature)) {
    return formatDt(value);
  }
  return numberFormat.format(value);
}
