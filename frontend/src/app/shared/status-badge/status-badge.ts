import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { STATUS_LABELS, TransactionStatus } from '../../core/models/client.model';

const BADGE_CLASS: Record<TransactionStatus, string> = {
  EN_COURS: 'fs-badge fs-badge--info',
  ACCEPTEE: 'fs-badge fs-badge--success',
  A_VERIFIER: 'fs-badge fs-badge--warning',
  BLOQUEE: 'fs-badge fs-badge--danger',
};

/** Badge coloré du statut d'une transaction (styles globaux .fs-badge). */
@Component({
  selector: 'app-status-badge',
  template: `<span [class]="badgeClass()">{{ label() }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusBadge {
  readonly status = input.required<TransactionStatus>();

  protected readonly badgeClass = computed(() => BADGE_CLASS[this.status()]);
  protected readonly label = computed(() => STATUS_LABELS[this.status()]);
}
