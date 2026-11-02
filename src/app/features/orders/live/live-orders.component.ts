import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  SUB_ORDER_STATUS_LABELS,
  StoreOrder,
  SubOrderStatus,
} from '../../../core/models/order.model';
import { piastresToEgp } from '../../../core/models/money.model';
import { OrderService } from '../../../core/services/order.service';
import { SocketService } from '../../../core/services/socket.service';
import { ToastService } from '../../../core/services/toast.service';
import { apiErrorMessage } from '../../../core/utils/api-error';

@Component({
  selector: 'vnd-live-orders',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './live-orders.component.html',
  styleUrl: './live-orders.component.scss',
})
export class LiveOrdersComponent {
  private readonly ordersApi = inject(OrderService);
  private readonly socket = inject(SocketService);
  private readonly toast = inject(ToastService);

  readonly socketStatus = this.socket.status;

  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly orders = this.ordersApi.liveOrders;
  readonly egp = piastresToEgp;

  readonly displayOrders = computed(() =>
    [...this.orders()].sort((a, b) => b.placedAt.localeCompare(a.placedAt)),
  );

  constructor() {
    this.refresh();
  }

  refresh(): void {
    if (this.orders().length === 0) {
      this.loading.set(true);
    }
    this.loadError.set(null);
    this.ordersApi.listLive().subscribe({
      next: () => {
        this.loading.set(false);
        this.loadError.set(null);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.loadError.set(apiErrorMessage(error, 'تعذر تحميل الطلبات.'));
        this.toast.show({
          title: 'تعذر التحميل',
          body: apiErrorMessage(error, 'تعذر تحميل الطلبات.'),
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
      case 'PENDING':
        return 'live-orders__badge live-orders__badge--pending';
      case 'PREPARING':
        return 'live-orders__badge live-orders__badge--preparing';
      case 'READY_FOR_PICKUP':
        return 'live-orders__badge live-orders__badge--ready';
      default:
        return 'live-orders__badge live-orders__badge--default';
    }
  }
}
