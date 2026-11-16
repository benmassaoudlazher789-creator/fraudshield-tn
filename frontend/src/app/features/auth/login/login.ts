import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { AuthService } from '../../../core/auth/auth.service';

/** Page de connexion (maquette "Connexion") : redirection selon le rôle après succès. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, MessageModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: ['', [Validators.required]],
  });

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showPassword = signal(false);
  protected readonly year = new Date().getFullYear();

  protected readonly highlights = [
    {
      icon: 'pi pi-bolt',
      title: 'Analyse en temps réel',
      text: 'Détection instantanée des anomalies lors de chaque transaction bancaire.',
    },
    {
      icon: 'pi pi-chart-line',
      title: 'Explication de chaque alerte',
      text: 'Compréhension des motifs et indicateurs de suspicion sans boîte noire.',
    },
    {
      icon: 'pi pi-check-square',
      title: 'Validation par un analyste',
      text: "Flux d'investigation ergonomique pour confirmer ou lever les alertes.",
    },
  ];

  /** Message d'erreur d'un champ, affiché seulement après interaction. */
  protected fieldError(name: 'email' | 'password'): string | null {
    const control = this.form.controls[name];
    if (!control.invalid || !(control.touched || control.dirty)) {
      return null;
    }
    if (control.hasError('required')) {
      return name === 'email' ? "L'adresse e-mail est obligatoire." : 'Le mot de passe est obligatoire.';
    }
    if (control.hasError('email')) {
      return "L'adresse e-mail n'est pas valide.";
    }
    return 'Valeur invalide.';
  }

  protected togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login({ email: email.trim(), password }).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl(this.auth.homeUrl());
      },
      error: (err: unknown) => {
        this.loading.set(false);
        this.error.set(loginErrorMessage(err));
      },
    });
  }
}

/** Traduit l'erreur HTTP en message clair pour l'utilisateur. */
function loginErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401) {
      return 'Adresse e-mail ou mot de passe incorrect.';
    }
    if (err.status === 0) {
      return 'Serveur injoignable. Vérifiez que le backend est démarré.';
    }
  }
  return 'Une erreur inattendue est survenue. Veuillez réessayer.';
}
