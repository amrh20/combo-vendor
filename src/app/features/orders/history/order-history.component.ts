import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { VendorOrder } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';

@Component({
  selector: 'vnd-order-history',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, DecimalPipe],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.scss',
})
export class OrderHistoryComponent {
  private readonly fb = inject(FormBuilder);
  private readonly ordersApi = inject(OrderService);

  readonly loading = signal(false);
  readonly rows = signal<VendorOrder[]>([]);

  readonly filters = this.fb.nonNullable.group({
    from: [''],
    to: [''],
  });

  constructor() {
    this.search();
  }

  search(): void {
    this.loading.set(true);
    const { from, to } = this.filters.getRawValue();
    this.ordersApi.listHistory({ from: from || undefined, to: to || undefined }).subscribe({
      next: (items) => {
        this.rows.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(status: VendorOrder['status']): string {
    const map: Record<VendorOrder['status'], string> = {
      pending: 'قيد الانتظار',
      accepted: 'مقبول',
      preparing: 'تحضير',
      ready: 'جاهز',
      completed: 'مكتمل',
      cancelled: 'ملغي',
    };
    return map[status] ?? status;
  }
}
