import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PasswordToggleDirective } from '../../core/directives/password-toggle.directive';
import { StoreStatus } from '../../core/models/store.model';
import { AuthService, isInvalidCredentials } from '../../core/services/auth.service';
import { StoreProfileService } from '../../core/services/store-profile.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';

/** Matches backend `newPasswordSchema` (8+ chars, at least one letter and one digit). */
const NEW_PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const STATUS_LABELS: Record<StoreStatus, string> = {
  OPEN: 'مفتوح',
  BUSY: 'مزدحم',
  CLOSED: 'مغلق',
};

const ROLE_LABELS = {
  MANAGER: 'مدير',
  CASHIER: 'كاشير',
} as const;

@Component({
  selector: 'vnd-settings',
  standalone: true,
  imports: [ReactiveFormsModule, PasswordToggleDirective],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss',
})
export class SettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly storeApi = inject(StoreProfileService);
  private readonly toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly passwordOpen = signal(false);
  readonly store = this.storeApi.profile;
  readonly account = computed(() => this.auth.currentUser());

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: [
      '',
      [Validators.required, Validators.minLength(8), Validators.pattern(NEW_PASSWORD_PATTERN)],
    ],
    confirmPassword: ['', Validators.required],
  });

  constructor() {
    this.storeApi.load().subscribe({ error: () => undefined });
  }

  statusLabel(status: StoreStatus): string {
    return STATUS_LABELS[status] ?? status;
  }

  statusClass(status: StoreStatus): string {
    return `settings__status settings__status--${status.toLowerCase()}`;
  }

  roleLabel(role: 'MANAGER' | 'CASHIER'): string {
    return ROLE_LABELS[role] ?? role;
  }

  display(value: string | null | undefined): string {
    const trimmed = value?.trim();
    return trimmed ? trimmed : '—';
  }

  openPassword(): void {
    if (this.submitting()) {
      return;
    }
    this.form.reset();
    this.passwordOpen.set(true);
  }

  closePassword(): void {
    if (this.submitting()) {
      return;
    }
    this.passwordOpen.set(false);
    this.form.reset();
  }

  submit(): void {
    if (this.submitting()) {
      return;
    }

    const { newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.form.controls.confirmPassword.setErrors({ mismatch: true });
      this.form.markAllAsTouched();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { currentPassword } = this.form.getRawValue();
    this.submitting.set(true);
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.submitting.set(false);
        this.passwordOpen.set(false);
        this.form.reset();
        this.toast.show({
          title: 'تم التحديث',
          body: 'تم تغيير كلمة المرور بنجاح.',
          variant: 'success',
        });
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        if (isInvalidCredentials(error)) {
          this.toast.show({
            title: 'تعذر التحديث',
            body: 'كلمة المرور الحالية غير صحيحة',
            variant: 'danger',
          });
          return;
        }
        this.toast.show({
          title: 'تعذر التحديث',
          body: apiErrorMessage(error, 'تعذر تغيير كلمة المرور. حاول مرة أخرى.'),
          variant: 'danger',
        });
      },
    });
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.passwordOpen()) {
      this.closePassword();
    }
  }
}
