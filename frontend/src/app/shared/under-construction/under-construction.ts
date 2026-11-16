import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Page provisoire : le titre vient de data.title de la route (withComponentInputBinding). */
@Component({
  selector: 'app-under-construction',
  template: `
    <header class="page-header">
      <span class="eyebrow">FraudShield TN</span>
      <h1>{{ title() }}</h1>
    </header>
    <section class="fs-card placeholder">
      <i class="pi pi-wrench" aria-hidden="true"></i>
      <h2>Page en construction</h2>
      <p>Cette section sera disponible dans une prochaine étape.</p>
    </section>
  `,
  styles: `
    .page-header {
      margin-bottom: 1.5rem;
    }
    .eyebrow {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--fs-text-muted);
    }
    h1 {
      margin: 0.125rem 0 0;
      font-size: 28px;
      line-height: 36px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1.5rem;
      text-align: center;
    }
    .placeholder .pi {
      font-size: 2rem;
      color: var(--fs-primary);
      margin-bottom: 0.75rem;
    }
    h2 {
      margin: 0 0 0.25rem;
      font-size: 20px;
      font-weight: 600;
    }
    p {
      margin: 0;
      color: var(--fs-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UnderConstruction {
  readonly title = input('Page');
}
