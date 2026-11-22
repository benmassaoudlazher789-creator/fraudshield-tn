import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TransactionInfo } from '../../core/models/analyst.model';
import { TYPE_LABELS, TransactionType } from '../../core/models/client.model';
import { DtPipe } from '../../core/pipes/dt.pipe';
import { ShortDatePipe } from '../../core/pipes/short-date.pipe';
import { Flag } from '../flag/flag';
import { StatusBadge } from '../status-badge/status-badge';

/**
 * Frise chronologique de l'historique d'un client (du plus récent au plus ancien).
 * La première entrée est l'opération en alerte, mise en évidence.
 */
@Component({
  selector: 'app-client-timeline',
  imports: [DtPipe, ShortDatePipe, Flag, StatusBadge],
  template: `
    <ol class="timeline">
      @for (tx of transactions(); track tx.id; let first = $first) {
        <li class="item" [class.item--current]="first" [class]="'item--' + tx.status">
          <span class="dot" aria-hidden="true"></span>
          <div class="body">
            <div class="row">
              <time class="date tabular" [attr.datetime]="tx.createdAt">{{ tx.createdAt | shortDate }}</time>
              @if (first) {
                <span class="current-tag">Opération en alerte</span>
              }
            </div>
            <div class="row row--main">
              <span class="who">
                <strong>{{ tx.beneficiary }}</strong>
                <span class="sub">{{ typeLabel(tx.type) }}</span>
              </span>
              <span class="amount tabular">{{ tx.amount | dt }}</span>
            </div>
            <div class="row">
              <span class="country"><app-flag [code]="tx.country" />{{ tx.country }}</span>
              <app-status-badge [status]="tx.status" />
            </div>
          </div>
        </li>
      }
    </ol>
  `,
  styles: `
    .timeline {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .item {
      position: relative;
      display: flex;
      gap: 1rem;
      padding-bottom: 1rem;
      --dot: var(--fs-success);
    }
    .item--A_VERIFIER { --dot: var(--fs-warning); }
    .item--BLOQUEE { --dot: var(--fs-danger); }
    .item--EN_COURS { --dot: var(--fs-info); }
    /* Trait vertical reliant les points */
    .item:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 7px;
      top: 18px;
      bottom: -2px;
      width: 2px;
      background: var(--fs-border);
    }
    .dot {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      margin-top: 2px;
      border-radius: 50%;
      background: var(--fs-surface);
      border: 4px solid var(--dot);
    }
    .item--current .dot {
      box-shadow: 0 0 0 4px var(--fs-danger-soft);
    }
    .body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      padding: 0.625rem 0.875rem;
      border-radius: var(--fs-radius);
      background: var(--fs-surface-low);
      transition: background-color 0.15s;
    }
    .item:hover .body { background: var(--fs-row-hover); box-shadow: inset 0 0 0 1px var(--fs-border); }
    .item--current .body {
      background: var(--fs-danger-bg);
      box-shadow: inset 3px 0 0 var(--fs-danger);
    }
    .row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.25rem 0.75rem;
    }
    .row--main { align-items: flex-start; }
    .date {
      font-size: 12px;
      color: var(--fs-text-muted);
    }
    .current-tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--fs-danger-strong);
    }
    .who {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .sub {
      display: block;
      font-size: 12px;
      color: var(--fs-text-muted);
    }
    .amount {
      font-weight: 600;
      white-space: nowrap;
    }
    .country {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 12px;
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientTimeline {
  readonly transactions = input.required<readonly TransactionInfo[]>();

  protected readonly typeLabel = (type: TransactionType) => TYPE_LABELS[type];
}
