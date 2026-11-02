import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { SUB_ORDER_STATUS_LABELS, StoreOrder, SubOrderStatus } from '../../../core/models/order.model';
import { piastresToEgp } from '../../../core/models/money.model';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';
import { CursorPages } from '../../../shared/components/pagination/cursor-pages';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'vnd-order-history',
  standalone: true,
  imports: [DatePipe, DecimalPipe, PaginationComponent],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.scss',
})
export class OrderHistoryComponent {
  private readonly ordersApi = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly rows = signal<StoreOrder[]>([]);
  readonly page = signal(1);
  readonly hasNext = signal(false);
  readonly egp = piastresToEgp;
  private readonly pages = new CursorPages();

  constructor() {
    this.fetchPage(1);
  }

  goTo(page: number): void {
    if (this.loading() || !this.pages.canOpen(page, this.page(), this.hasNext())) {
      return;
    }
    this.fetchPage(page);
  }

  private fetchPage(page: number): void {
    this.loading.set(true);
    this.ordersApi.listHistory(this.pages.cursorFor(page)).subscribe({
      next: (result) => {
        this.rows.set(sortHistoryNewestFirst(result.items));
        this.pages.remember(page, result.nextCursor);
        this.page.set(page);
        this.hasNext.set(result.nextCursor != null);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.toast.show({
          title: 'تعذر التحميل',
          body: apiErrorMessage(error, 'تعذر تحميل سجل الطلبات.'),
          variant: 'danger',
        });
      },
    });
  }

  statusLabel(status: SubOrderStatus): string {
    return SUB_ORDER_STATUS_LABELS[status] ?? status;
  }

  statusBadgeClass(status: SubOrderStatus): string {
    switch (status) {
      case 'DELIVERED':
        return 'text-bg-success';
      case 'REJECTED':
        return 'text-bg-danger';
      case 'CANCELLED':
        return 'text-bg-secondary';
      default:
        return 'text-bg-light border';
    }
  }
}

function sortHistoryNewestFirst(orders: StoreOrder[]): StoreOrder[] {
  return [...orders].sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}
