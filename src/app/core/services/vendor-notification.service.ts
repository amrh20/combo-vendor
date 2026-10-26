import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VendorNotification } from '../models/notification.model';
import { VendorOrder } from '../models/order.model';
import { OrderService } from './order.service';
import { SocketService } from './socket.service';
import { ToastService } from './toast.service';

const NEW_ORDER_SOUND = 'assets/sounds/new-order.mp3';

@Injectable({ providedIn: 'root' })
export class VendorNotificationService {
  private readonly socket = inject(SocketService);
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);

  private readonly items = signal<VendorNotification[]>([]);

  readonly notifications = this.items.asReadonly();
  readonly unreadCount = computed(() => this.items().filter((item) => !item.read).length);

  constructor() {
    this.socket.incomingOrder$.pipe(takeUntilDestroyed()).subscribe((order) => {
      this.orders.upsertLiveOrder(order);
      this.pushNewOrder(order);
      this.playNewOrderSound();
      this.toast.show({
        title: 'طلب جديد',
        body: `تم استلام ${order.orderNumber} — ${order.customerName}`,
        variant: 'info',
      });
    });
  }

  markAllRead(): void {
    this.items.update((items) => items.map((item) => (item.read ? item : { ...item, read: true })));
  }

  private pushNewOrder(order: VendorOrder): void {
    const notification: VendorNotification = {
      id: `${order.id}-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      message: `طلب جديد: ${order.orderNumber}`,
      createdAt: new Date().toISOString(),
      read: false,
    };
    this.items.update((items) => [notification, ...items].slice(0, 50));
  }

  private playNewOrderSound(): void {
    try {
      const audio = new Audio(NEW_ORDER_SOUND);
      void audio.play().catch(() => undefined);
    } catch {
      // Autoplay policy must not break the KDS.
    }
  }
}

export function formatNotificationAge(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60_000));
  if (minutes < 60) {
    return `منذ ${minutes} د`;
  }
  const hours = Math.floor(minutes / 60);
  return `منذ ${hours} س`;
}
