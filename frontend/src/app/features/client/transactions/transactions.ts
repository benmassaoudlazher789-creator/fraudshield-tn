import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';

import {
  ClientTransaction,
  TYPE_LABELS,
  TransactionType,
  countryName,
} from '../../../core/models/client.model';
import { DtPipe } from '../../../core/pipes/dt.pipe';
import { ClientService } from '../../../core/services/client.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { Flag } from '../../../shared/flag/flag';
import { StatusBadge } from '../../../shared/status-badge/status-badge';

/** Page /client/transactions : historique du client sous forme de tableau triable. */
@Component({
  selector: 'app-transactions',
  imports: [DatePipe, ButtonModule, TableModule, DtPipe, StatusBadge, Flag],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Transactions implements OnInit {
  private readonly clientService = inject(ClientService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly transactions = signal<ClientTransaction[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly typeLabel = (type: TransactionType) => TYPE_LABELS[type];
  protected readonly countryName = countryName;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.clientService
      .getTransactions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.transactions.set(list);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Impossible de charger vos transactions.'));
        },
      });
  }
}
