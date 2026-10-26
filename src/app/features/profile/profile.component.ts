import { Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BusinessHoursDay } from '../../core/models/store.model';
import { StoreProfileService } from '../../core/services/store-profile.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'vnd-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  private readonly storeApi = inject(StoreProfileService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    logoUrl: [''],
    coverUrl: [''],
    defaultPreparationMinutes: [15, [Validators.required, Validators.min(1)]],
    phone: [''],
    address: [''],
    businessHours: this.fb.array<FormGroup>([]),
  });

  constructor() {
    this.storeApi.load().subscribe((profile) => this.patchForm(profile));
  }

  get hours(): FormArray {
    return this.form.controls.businessHours;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.storeApi
      .update({
        name: raw.name,
        logoUrl: raw.logoUrl || undefined,
        coverUrl: raw.coverUrl || undefined,
        defaultPreparationMinutes: raw.defaultPreparationMinutes,
        phone: raw.phone || undefined,
        address: raw.address || undefined,
        businessHours: raw.businessHours as BusinessHoursDay[],
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.show({ title: 'تم الحفظ', body: 'تم تحديث ملف المتجر.', variant: 'success' });
        },
        error: () => this.saving.set(false),
      });
  }

  private patchForm(profile: {
    name: string;
    logoUrl?: string;
    coverUrl?: string;
    defaultPreparationMinutes: number;
    phone?: string;
    address?: string;
    businessHours: BusinessHoursDay[];
  }): void {
    this.form.patchValue({
      name: profile.name,
      logoUrl: profile.logoUrl ?? '',
      coverUrl: profile.coverUrl ?? '',
      defaultPreparationMinutes: profile.defaultPreparationMinutes,
      phone: profile.phone ?? '',
      address: profile.address ?? '',
    });
    this.hours.clear();
    for (const day of profile.businessHours) {
      this.hours.push(this.createDayGroup(day));
    }
  }

  private createDayGroup(day: BusinessHoursDay) {
    return this.fb.nonNullable.group({
      day: [day.day],
      open: [day.open],
      close: [day.close],
      closed: [day.closed],
    });
  }
}
