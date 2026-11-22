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
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription, catchError, filter, forkJoin, map, of, switchMap, take, takeWhile, tap, timer } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { AuthService } from '../../../core/auth/auth.service';
import {
  Account,
  COUNTRIES,
  ClientTransaction,
  TYPE_LABELS,
  TransactionStatus,
  TransactionType,
  countryName,
} from '../../../core/models/client.model';
import { DtPipe, formatDt } from '../../../core/pipes/dt.pipe';
import { ShortDatePipe } from '../../../core/pipes/short-date.pipe';
import { ClientService } from '../../../core/services/client.service';
import { maskAccountRef } from '../../../core/utils/account-ref';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { Flag } from '../../../shared/flag/flag';
import { StatusBadge } from '../../../shared/status-badge/status-badge';

/** Interrogation du statut : toutes les 2 s, 20 s au maximum. */
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 10;
const RECENT_COUNT = 5;

type BannerKind = 'pending' | 'success' | 'blocked' | 'timeout' | 'error';

interface Banner {
  kind: BannerKind;
  title: string;
  text?: string;
}

/** Page /client/paiement : solde, formulaire de paiement et suivi du scoring. */
@Component({
  selector: 'app-payment',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    SelectModule,
    DtPipe,
    ShortDatePipe,
    StatusBadge,
    EmptyState,
    Flag,
  ],
  templateUrl: './payment.html',
  styleUrl: './payment.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Payment implements OnInit {
  private readonly clientService = inject(ClientService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);
  private pollSubscription?: Subscription;

  protected readonly user = inject(AuthService).currentUser;
  protected readonly account = signal<Account | null>(null);
  protected readonly transactions = signal<ClientTransaction[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly banner = signal<Banner | null>(null);

  protected readonly analysing = computed(() => this.banner()?.kind === 'pending');
  protected readonly maskedRef = computed(() => maskAccountRef(this.account()?.accountRef));
  protected readonly recent = computed(() => this.transactions().slice(0, RECENT_COUNT));

  protected readonly quickAmounts = [50, 100, 500];
  protected readonly typeOptions = (Object.keys(TYPE_LABELS) as TransactionType[]).map((value) => ({
    value,
    label: TYPE_LABELS[value],
  }));
  protected readonly countryOptions = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));
  protected readonly countryName = countryName;

  /** Le montant ne peut pas dépasser le solde disponible. */
  private readonly maxBalance = (control: AbstractControl<number | null>): ValidationErrors | null => {
    const balance = this.account()?.balance;
    return balance !== undefined && control.value !== null && control.value > balance
      ? { maxBalance: balance }
      : null;
  };

  /** Refuse un bénéficiaire composé uniquement d'espaces. */
  private readonly notBlank = (control: AbstractControl<string>): ValidationErrors | null =>
    control.value && !control.value.trim() ? { required: true } : null;

  protected readonly form = this.fb.group({
    beneficiary: ['', [Validators.required, Validators.maxLength(100), this.notBlank]],
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.001), this.maxBalance]),
    type: this.fb.control<TransactionType>('PAYMENT', Validators.required),
    country: ['TN', Validators.required],
  });

  ngOnInit(): void {
    forkJoin({ account: this.clientService.getAccount(), transactions: this.clientService.getTransactions() })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ account, transactions }) => {
          this.setAccount(account);
          this.transactions.set(transactions);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.loadError.set(apiErrorMessage(err, 'Impossible de charger votre compte.'));
        },
      });
  }

  protected setAmount(amount: number): void {
    const control = this.form.controls.amount;
    control.setValue(amount);
    control.markAsDirty();
  }

  protected fieldError(name: 'beneficiary' | 'amount'): string | null {
    const control = this.form.controls[name];
    if (!control.invalid || !(control.touched || control.dirty)) {
      return null;
    }
    if (control.hasError('required')) {
      return name === 'beneficiary' ? 'Le bénéficiaire est obligatoire.' : 'Le montant est obligatoire.';
    }
    if (control.hasError('maxlength')) {
      return '100 caractères maximum.';
    }
    if (control.hasError('min')) {
      return 'Le montant doit être supérieur à 0.';
    }
    if (control.hasError('maxBalance')) {
      return `Le montant dépasse votre solde disponible (${formatDt(control.getError('maxBalance'))}).`;
    }
    return 'Valeur invalide.';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { beneficiary, amount, type, country } = this.form.getRawValue();
    this.submitting.set(true);
    this.banner.set(null);

    this.clientService
      .createTransaction({ beneficiary: beneficiary.trim(), amount: amount as number, type, country })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tx) => {
          this.submitting.set(false);
          this.banner.set({
            kind: 'pending',
            title: "Paiement en cours d'analyse…",
            text: `${formatDt(tx.amount)} vers ${tx.beneficiary}. Le résultat s'affiche dans quelques secondes.`,
          });
          this.transactions.update((list) => [tx, ...list.filter((t) => t.id !== tx.id)]);
          this.form.reset();
          this.watchStatus(tx.id);
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.banner.set({
            kind: 'error',
            title: 'Paiement refusé',
            text: apiErrorMessage(err, "Le paiement n'a pas pu être envoyé. Veuillez réessayer."),
          });
        },
      });
  }

  protected closeBanner(): void {
    this.banner.set(null);
  }

  /**
   * Interroge la liste des transactions jusqu'au statut final (ou 20 s).
   * takeUntilDestroyed arrête le polling si l'utilisateur quitte la page.
   */
  private watchStatus(id: number): void {
    this.pollSubscription?.unsubscribe();
    let lastStatus: TransactionStatus = 'EN_COURS';

    this.pollSubscription = timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS)
      .pipe(
        take(MAX_POLLS),
        // Une erreur réseau ponctuelle n'interrompt pas le suivi
        switchMap(() => this.clientService.getTransactions().pipe(catchError(() => of(null)))),
        filter((list): list is ClientTransaction[] => list !== null),
        tap((list) => this.transactions.set(list)),
        map((list) => list.find((t) => t.id === id)?.status ?? 'EN_COURS'),
        takeWhile((status) => status === 'EN_COURS', true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (status) => (lastStatus = status),
        complete: () => this.showResult(lastStatus),
      });
  }

  /** Affiche le résultat final au client, sans score ni motif. */
  private showResult(status: TransactionStatus): void {
    if (this.destroyRef.destroyed) {
      return;
    }
    switch (status) {
      case 'ACCEPTEE':
        this.banner.set({
          kind: 'success',
          title: 'Transaction acceptée',
          text: "L'opération a été validée avec succès. Votre solde a été mis à jour.",
        });
        this.refreshAccount();
        break;
      case 'A_VERIFIER':
      case 'BLOQUEE':
        this.banner.set({
          kind: 'blocked',
          title: 'Transaction bloquée — Cette opération nécessite une vérification.',
          text: 'Votre banque va vous contacter.',
        });
        break;
      default:
        this.banner.set({
          kind: 'timeout',
          title: 'Analyse toujours en cours',
          text: 'Le résultat apparaîtra dans « Mes transactions » dès la fin de la vérification.',
        });
    }
  }

  private refreshAccount(): void {
    this.clientService
      .getAccount()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (account) => this.setAccount(account), error: () => undefined });
  }

  /** Met à jour le solde puis revalide le montant (plafond = solde). */
  private setAccount(account: Account): void {
    this.account.set(account);
    this.form.controls.amount.updateValueAndValidity();
  }
}
