import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { AlertDecision, AnalystDecision } from '../../core/models/analyst.model';

/**
 * Badge d'une alerte : décision de l'analyste si elle existe,
 * sinon décision automatique (À vérifier / Bloquée auto).
 */
@Component({
  selector: 'app-alert-badge',
  template: `<span [class]="view().cls">{{ view().label }}</span>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertBadge {
  readonly decision = input.required<AlertDecision>();
  readonly analystDecision = input<AnalystDecision | null>(null);

  protected readonly view = computed(() => {
    switch (this.analystDecision()) {
      case 'FRAUDE_CONFIRMEE':
        return { cls: 'fs-badge fs-badge--danger', label: 'Fraude confirmée' };
      case 'FAUX_POSITIF':
        return { cls: 'fs-badge fs-badge--success', label: 'Faux positif' };
    }
    return this.decision() === 'BLOQUEE'
      ? { cls: 'fs-badge fs-badge--danger', label: 'Bloquée auto' }
      : { cls: 'fs-badge fs-badge--warning', label: 'À vérifier' };
  });
}
