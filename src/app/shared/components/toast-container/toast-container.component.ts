import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'vnd-toast-container',
  standalone: true,
  imports: [NgClass],
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.scss',
})
export class ToastContainerComponent {
  private readonly toast = inject(ToastService);
  readonly toasts = this.toast.toasts;

  dismiss(id: string): void {
    this.toast.dismiss(id);
  }
}
