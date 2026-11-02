import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { PasswordToggleDirective } from '../../../core/directives/password-toggle.directive';
import {
  AuthService,
  isInvalidCredentials,
  isStoreAppDisabled,
} from '../../../core/services/auth.service';

const USERNAME_PATTERN = /^[a-z0-9]+$/;

@Component({
  selector: 'vnd-login',
  standalone: true,
  imports: [ReactiveFormsModule, PasswordToggleDirective, ToastModule],
  providers: [MessageService],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messages = inject(MessageService);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: [
      '',
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(32),
        Validators.pattern(USERNAME_PATTERN),
      ],
    ],
    password: ['', Validators.required],
  });

  submit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { username, password } = this.form.getRawValue();
    this.auth.login(username.trim().toLowerCase(), password).subscribe({
      next: () => {
        void this.router.navigateByUrl('/dashboard');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        const message = this.messageFor(error);
        this.errorMessage.set(message);
        this.messages.add({
          severity: 'error',
          summary: 'تعذر الدخول',
          detail: message,
          life: 5000,
        });
      },
      complete: () => this.submitting.set(false),
    });
  }

  private messageFor(error: unknown): string {
    if (isInvalidCredentials(error)) {
      return 'اسم المستخدم أو كلمة المرور غير صحيحة';
    }
    if (isStoreAppDisabled(error)) {
      return 'المحل ده بيتدار من كومبو، كلم الأوبريشن';
    }
    return 'تعذر إتمام تسجيل الدخول. حاول مرة أخرى.';
  }
}
