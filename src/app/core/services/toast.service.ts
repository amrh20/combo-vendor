import { Injectable, signal } from '@angular/core';
import { ToastMessage } from '../models/notification.model';

const AUTO_DISMISS_MS = 6000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly items = signal<ToastMessage[]>([]);
  readonly toasts = this.items.asReadonly();

  show(input: { title: string; body: string; variant?: ToastMessage['variant'] }): void {
    const toast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: input.title,
      body: input.body,
      variant: input.variant ?? 'info',
      createdAt: Date.now(),
    };
    this.items.update((list) => [...list, toast]);
    window.setTimeout(() => this.dismiss(toast.id), AUTO_DISMISS_MS);
  }

  dismiss(id: string): void {
    this.items.update((list) => list.filter((item) => item.id !== id));
  }
}
