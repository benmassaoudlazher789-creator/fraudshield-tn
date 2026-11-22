import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

import { BusinessRule } from '../../../core/models/admin.model';
import { AdminService } from '../../../core/services/admin.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { AdminTabs } from '../admin-tabs/admin-tabs';

/** Présentation d'une règle : texte, icône et contraintes du champ seuil. */
interface RuleView {
  title: string;
  description: string;
  icon: string;
  danger?: boolean;
  fieldLabel: string;
  suffix: string;
  decimals: number;
  min: number;
  max?: number;
}

const RULE_VIEWS: Record<string, RuleView> = {
  MAX_AMOUNT_NEW_COUNTRY: {
    title: 'Bloquer les montants élevés vers un nouveau pays',
    description:
      "Attribue un score de risque de 85 si le montant dépasse le seuil et que le pays de destination n'a jamais été utilisé par ce compte.",
    icon: 'pi pi-globe',
    fieldLabel: 'Seuil de montant :',
    suffix: 'DT',
    decimals: 3,
    min: 0.001,
  },
  VELOCITY_10_MIN: {
    title: 'Alerte de vélocité anormale',
    description:
      'Attribue un score de risque de 60 (vérification par un analyste) si le compte dépasse ce nombre de transactions sur 10 minutes.',
    icon: 'pi pi-gauge',
    fieldLabel: 'Fréquence : plus de',
    suffix: 'tx en 10 min',
    decimals: 0,
    min: 1,
  },
  AUTO_BLOCK_SCORE: {
    title: 'Seuil du score de risque pour blocage automatique',
    description:
      'Toute transaction dont le score final est égal ou supérieur à ce seuil est bloquée automatiquement. Entre 50 et ce seuil, elle est soumise à un analyste.',
    icon: 'pi pi-ban',
    danger: true,
    fieldLabel: 'Score de risque :',
    suffix: '/ 100',
    decimals: 0,
    min: 50,
    max: 100,
  },
};

type RuleForm = FormGroup<{ threshold: FormControl<number | null>; enabled: FormControl<boolean> }>;

/** Une carte de règle : valeur enregistrée, brouillon du formulaire et retour de l'enregistrement. */
interface RuleRow {
  view: RuleView;
  saved: ReturnType<typeof signal<BusinessRule>>;
  form: RuleForm;
  saving: ReturnType<typeof signal<boolean>>;
  feedback: ReturnType<typeof signal<{ ok: boolean; text: string } | null>>;
}

/** Page /admin/regles : seuils et activation des règles métier, appliqués immédiatement. */
@Component({
  selector: 'app-rules',
  imports: [ReactiveFormsModule, ButtonModule, InputNumberModule, ToggleSwitchModule, AdminTabs, EmptyState],
  templateUrl: './rules.html',
  styleUrl: './rules.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Rules {
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly rows = signal<RuleRow[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.adminService
      .getRules()
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (rules) => {
          this.rows.set(rules.map((rule) => this.toRow(rule)));
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Impossible de charger les règles métier.'));
        },
      });
  }

  protected save(row: RuleRow): void {
    row.form.markAllAsTouched();
    if (row.form.invalid || row.saving()) {
      return;
    }
    const { threshold, enabled } = row.form.getRawValue();
    row.saving.set(true);
    row.feedback.set(null);
    this.adminService
      .updateRule(row.saved().id, { threshold: threshold!, enabled })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rule) => {
          row.saved.set(rule);
          row.form.reset({ threshold: rule.threshold, enabled: rule.enabled });
          row.saving.set(false);
          row.feedback.set({ ok: true, text: 'Règle enregistrée : appliquée dès la prochaine transaction.' });
        },
        error: (err: unknown) => {
          row.saving.set(false);
          row.feedback.set({ ok: false, text: apiErrorMessage(err, "Impossible d'enregistrer la règle.") });
        },
      });
  }

  /** Annule les modifications non enregistrées. */
  protected cancel(row: RuleRow): void {
    const rule = row.saved();
    row.form.reset({ threshold: rule.threshold, enabled: rule.enabled });
    row.feedback.set(null);
  }

  protected thresholdError(row: RuleRow): string | null {
    const control = row.form.controls.threshold;
    if (control.valid || !(control.touched || control.dirty)) {
      return null;
    }
    if (control.hasError('required')) {
      return 'Le seuil est obligatoire.';
    }
    const { min, max } = row.view;
    return max !== undefined ? `Valeur attendue entre ${min} et ${max}.` : `Le seuil doit être supérieur à 0.`;
  }

  private toRow(rule: BusinessRule): RuleRow {
    const view = RULE_VIEWS[rule.code] ?? {
      title: rule.label,
      description: rule.code,
      icon: 'pi pi-sliders-h',
      fieldLabel: 'Seuil :',
      suffix: '',
      decimals: 3,
      min: 0.001,
    };
    const validators = [Validators.required, Validators.min(view.min)];
    if (view.max !== undefined) {
      validators.push(Validators.max(view.max));
    }
    return {
      view,
      saved: signal(rule),
      form: this.fb.group({
        threshold: this.fb.control<number | null>(rule.threshold, validators),
        enabled: this.fb.control(rule.enabled),
      }),
      saving: signal(false),
      feedback: signal(null),
    };
  }
}
