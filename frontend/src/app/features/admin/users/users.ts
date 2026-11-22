import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AdminUser } from '../../../core/models/admin.model';
import { ROLE_LABELS, Role } from '../../../core/models/user.model';
import { AdminService } from '../../../core/services/admin.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { EmptyState } from '../../../shared/empty-state/empty-state';
import { AdminTabs } from '../admin-tabs/admin-tabs';

type DialogMode = 'create' | 'edit';

const ROLE_BADGE: Record<Role, string> = {
  CLIENT: 'role role--client',
  ANALYSTE: 'role role--analyst',
  ADMIN: 'role role--admin',
};

/** Page /admin/utilisateurs : liste paginée, recherche, création, modification, activation. */
@Component({
  selector: 'app-users',
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SelectModule,
    TableModule,
    AdminTabs,
    EmptyState,
  ],
  templateUrl: './users.html',
  styleUrl: './users.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Users {
  private readonly adminService = inject(AdminService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private loadSubscription?: Subscription;

  protected readonly roleOptions = (Object.keys(ROLE_LABELS) as Role[]).map((value) => ({
    value,
    label: ROLE_LABELS[value],
  }));
  protected readonly roleFilterOptions = [{ value: null, label: 'Tous les rôles' }, ...this.roleOptions];
  protected readonly statusFilterOptions = [
    { value: null, label: 'Tous les statuts' },
    { value: true, label: 'Actifs' },
    { value: false, label: 'Désactivés' },
  ];

  // ---------- Liste ----------
  protected readonly searchControl = this.fb.control('');
  protected readonly roleFilter = signal<Role | null>(null);
  protected readonly statusFilter = signal<boolean | null>(null);
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly total = signal(0);
  protected readonly first = signal(0);
  protected readonly rows = signal(10);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal<string | null>(null);
  protected readonly currentUserId = computed(() => this.auth.currentUser()?.userId ?? null);

  // ---------- Modale création / modification ----------
  protected readonly dialogVisible = signal(false);
  protected readonly dialogMode = signal<DialogMode>('create');
  protected readonly editedUser = signal<AdminUser | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
    role: this.fb.control<Role | null>(null, Validators.required),
  });
  /** Rôle choisi dans la modale (pour le message sur le compte bancaire). */
  protected readonly selectedRole = signal<Role | null>(null);

  // ---------- Confirmation activer / désactiver ----------
  protected readonly confirmVisible = signal(false);
  protected readonly confirmUser = signal<AdminUser | null>(null);
  protected readonly toggling = signal(false);

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.resetAndLoad());
    this.form.controls.role.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((role) => this.selectedRole.set(role));
  }

  protected roleBadge(role: Role): string {
    return ROLE_BADGE[role];
  }

  protected roleLabel(role: Role): string {
    return role === 'ANALYSTE' ? 'Analyste' : ROLE_LABELS[role];
  }

  /** "Karim Ben Salem" -> "KB". */
  protected initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  }

  protected onRoleFilter(role: Role | null): void {
    this.roleFilter.set(role);
    this.resetAndLoad();
  }

  protected onStatusFilter(enabled: boolean | null): void {
    this.statusFilter.set(enabled);
    this.resetAndLoad();
  }

  /** Appelé par p-table au démarrage et à chaque changement de page. */
  protected onLazyLoad(event: TableLazyLoadEvent): void {
    this.first.set(event.first ?? 0);
    this.rows.set(event.rows ?? this.rows());
    this.load();
  }

  // ---------- Modale ----------
  protected openCreate(): void {
    this.dialogMode.set('create');
    this.editedUser.set(null);
    this.form.reset({ fullName: '', email: '', password: '', role: null });
    this.form.controls.email.enable();
    this.form.controls.password.enable();
    this.openDialog();
  }

  protected openEdit(user: AdminUser): void {
    this.dialogMode.set('edit');
    this.editedUser.set(user);
    this.form.reset({ fullName: user.fullName, email: user.email, password: '', role: user.role });
    // L'e-mail (identifiant de connexion) et le mot de passe ne se modifient pas ici
    this.form.controls.email.disable();
    this.form.controls.password.disable();
    this.openDialog();
  }

  protected isInvalid(name: 'fullName' | 'email' | 'password' | 'role'): boolean {
    const control = this.form.controls[name];
    return control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.formError.set('Veuillez corriger les champs signalés.');
      return;
    }
    const { fullName, email, password, role } = this.form.getRawValue();
    const edited = this.editedUser();
    const request$ =
      this.dialogMode() === 'edit' && edited
        ? this.adminService.updateUser(edited.id, { fullName: fullName.trim(), role: role! })
        : this.adminService.createUser({ fullName: fullName.trim(), email: email.trim(), password, role: role! });

    this.saving.set(true);
    this.formError.set(null);
    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (user) => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.success.set(this.successMessage(user, edited === null));
        this.load();
      },
      error: (err: unknown) => {
        this.saving.set(false);
        if (err instanceof HttpErrorResponse && err.status === 409) {
          this.form.controls.email.setErrors({ taken: true });
        }
        this.formError.set(apiErrorMessage(err, "Impossible d'enregistrer l'utilisateur."));
      },
    });
  }

  // ---------- Activer / désactiver ----------
  protected askToggle(user: AdminUser): void {
    this.confirmUser.set(user);
    this.confirmVisible.set(true);
  }

  protected confirmToggle(): void {
    const user = this.confirmUser();
    if (!user || this.toggling()) {
      return;
    }
    this.toggling.set(true);
    this.adminService
      .setUserEnabled(user.id, !user.enabled)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.toggling.set(false);
          this.confirmVisible.set(false);
          this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));
          this.success.set(`${updated.fullName} a été ${updated.enabled ? 'activé(e)' : 'désactivé(e)'}.`);
          this.error.set(null);
        },
        error: (err: unknown) => {
          this.toggling.set(false);
          this.confirmVisible.set(false);
          this.error.set(apiErrorMessage(err, 'Impossible de modifier le statut.'));
        },
      });
  }

  private openDialog(): void {
    this.formError.set(null);
    this.selectedRole.set(this.form.controls.role.value);
    this.dialogVisible.set(true);
  }

  private successMessage(user: AdminUser, created: boolean): string {
    if (!created) {
      return `${user.fullName} a été modifié(e).`;
    }
    return user.accountRef
      ? `${user.fullName} a été créé(e) avec le compte ${user.accountRef} (solde 10 000 DT).`
      : `${user.fullName} a été créé(e).`;
  }

  private resetAndLoad(): void {
    this.first.set(0);
    this.load();
  }

  private load(): void {
    const page = Math.floor(this.first() / this.rows());
    this.loading.set(true);
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = this.adminService
      .getUsers(
        { search: this.searchControl.value, role: this.roleFilter(), enabled: this.statusFilter() },
        page,
        this.rows(),
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.users.set(result.content);
          this.total.set(result.totalElements);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Impossible de charger les utilisateurs.'));
        },
      });
  }
}
