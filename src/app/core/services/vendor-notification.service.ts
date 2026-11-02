import { Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { VendorNotification } from '../models/notification.model';
import { StoreOrderEvent } from '../models/order.model';
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
    this.socket.connected$.pipe(takeUntilDestroyed()).subscribe(() => {
      this.orders.listLive().subscribe({ error: () => undefined });
    });

    this.socket.orderEvents$.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.event === 'order.created') {
        this.onCreated(event);
        return;
      }
      this.onUpdated(event);
    });
  }

  markAllRead(): void {
    this.items.update((items) => items.map((item) => (item.read ? item : { ...item, read: true })));
  }

  private onCreated(event: StoreOrderEvent): void {
    const orderNumber = event.data.orderNumber ?? 'جديد';
    this.playNewOrderSound();
    this.pushNotification(event.data.subOrderId, orderNumber, `طلب جديد: ${orderNumber}`);
    this.toast.show({
      title: 'طلب جديد',
      body: `تم استلام ${orderNumber}.`,
      variant: 'info',
    });
  }

  private onUpdated(event: StoreOrderEvent): void {
    this.playNewOrderSound();
    if (event.data.type === 'sub_order.late') {
      this.orders.markLate(event.data.subOrderId);
      const known = this.orders.liveSnapshot().find((order) => order.id === event.data.subOrderId);
      this.toast.show({
        title: 'الطلب مستني ردك',
        body: known ? `الطلب ${known.orderNumber} لسه من غير رد.` : 'في طلب لسه من غير رد.',
        variant: 'warning',
      });
    }
  }

  private pushNotification(orderId: string, orderNumber: string, message: string): void {
    const notification: VendorNotification = {
      id: `${orderId}-${Date.now()}`,
      orderId,
      orderNumber,
      message,
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
      // Autoplay policy must not break the kitchen screen.
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
