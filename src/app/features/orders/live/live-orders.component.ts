import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { VendorOrder, VendorOrderStatus } from '../../../core/models/order.model';
import { OrderService } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';

interface KanbanColumn {
  id: VendorOrderStatus | 'pending' | 'preparing' | 'ready';
  title: string;
  statuses: VendorOrderStatus[];
}

@Component({
  selector: 'vnd-live-orders',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './live-orders.component.html',
  styleUrl: './live-orders.component.scss',
})
export class LiveOrdersComponent {
  private readonly ordersApi = inject(OrderService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly orders = this.ordersApi.liveOrders;
  readonly updatingId = signal<string | null>(null);

  readonly columns: KanbanColumn[] = [
    { id: 'pending', title: 'طلبات جديدة', statuses: ['pending', 'accepted'] },
    { id: 'preparing', title: 'قيد التحضير', statuses: ['preparing'] },
    { id: 'ready', title: 'جاهز للاستلام', statuses: ['ready'] },
  ];

  readonly board = computed(() =>
    this.columns.map((column) => ({
      ...column,
      items: this.orders().filter((order) => column.statuses.includes(order.status)),
    })),
  );

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.ordersApi.listLive().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  simulateIncoming(): void {
    const order = this.ordersApi.createMockIncomingOrder();
    this.ordersApi.pushMockOrder(order);
  }

  primaryAction(order: VendorOrder): { label: string; next: VendorOrderStatus } | null {
    switch (order.status) {
      case 'pending':
        return { label: 'قبول الطلب', next: 'preparing' };
      case 'accepted':
        return { label: 'بدء التحضير', next: 'preparing' };
      case 'preparing':
        return { label: 'جاهز للاستلام', next: 'ready' };
      default:
        return null;
    }
  }

  advance(order: VendorOrder): void {
    const action = this.primaryAction(order);
    if (!action) {
      return;
    }
    this.updateStatus(order.id, action.next);
  }

  updateStatus(orderId: string, status: VendorOrderStatus): void {
    this.updatingId.set(orderId);
    this.ordersApi.updateStatus(orderId, status).subscribe({
      next: (updated) => {
        this.updatingId.set(null);
        if (status === 'ready') {
          this.toast.show({
            title: 'جاهز للاستلام',
            body: `الطلب ${updated.orderNumber} في انتظار المندوب.`,
            variant: 'success',
          });
        }
      },
      error: () => this.updatingId.set(null),
    });
  }
}
