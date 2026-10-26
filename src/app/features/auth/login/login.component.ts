import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PasswordToggleDirective } from '../../../core/directives/password-toggle.directive';
import { AuthService, isInvalidCredentials } from '../../../core/services/auth.service';

@Component({
  selector: 'vnd-login',
  standalone: true,
  imports: [ReactiveFormsModule, PasswordToggleDirective],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['vendor@combo.app', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        void this.router.navigateByUrl('/dashboard');
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(this.messageFor(error));
      },
      complete: () => this.submitting.set(false),
    });
  }

  private messageFor(error: unknown): string {
    if (isInvalidCredentials(error)) {
      return 'بيانات الدخول غير صحيحة';
    }
    return 'تعذر إتمام تسجيل الدخول. حاول مرة أخرى.';
  }
}
