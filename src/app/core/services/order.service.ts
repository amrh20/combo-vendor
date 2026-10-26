import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, delay, map, of, tap } from 'rxjs';
import { API_BASE_URL, USE_MOCK_API } from '../api-config';
import { OrderListQuery, VendorOrder, VendorOrderStatus } from '../models/order.model';

const ORDERS_URL = `${API_BASE_URL}/v1/vendor/orders`;

let mockSeq = 1000;

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly liveOrdersState = signal<VendorOrder[]>(seedLiveOrders());
  readonly liveOrders = this.liveOrdersState.asReadonly();
  readonly mockOrderStream$ = new Subject<VendorOrder>();

  listLive(): Observable<VendorOrder[]> {
    if (USE_MOCK_API) {
      return of([...this.liveOrdersState()]).pipe(delay(150));
    }
    return this.http
      .get<VendorOrder[]>(ORDERS_URL, { params: { view: 'live' } })
      .pipe(tap((orders) => this.liveOrdersState.set(orders)));
  }

  listHistory(query: OrderListQuery = {}): Observable<VendorOrder[]> {
    if (USE_MOCK_API) {
      return of(seedHistoryOrders()).pipe(delay(200));
    }
    return this.http.get<VendorOrder[]>(`${ORDERS_URL}/history`, { params: { ...query } as Record<string, string> });
  }

  updateStatus(orderId: string, status: VendorOrderStatus): Observable<VendorOrder> {
    if (USE_MOCK_API) {
      this.liveOrdersState.update((orders) =>
        orders.map((order) =>
          order.id === orderId
            ? { ...order, status, updatedAt: new Date().toISOString() }
            : order,
        ),
      );
      const updated = this.liveOrdersState().find((o) => o.id === orderId)!;
      return of(updated).pipe(delay(120));
    }
    return this.http.patch<VendorOrder>(`${ORDERS_URL}/${orderId}/status`, { status });
  }

  upsertLiveOrder(order: VendorOrder): void {
    this.liveOrdersState.update((orders) => {
      const idx = orders.findIndex((o) => o.id === order.id);
      if (idx === -1) {
        return [order, ...orders];
      }
      const next = [...orders];
      next[idx] = order;
      return next;
    });
  }

  liveSnapshot(): VendorOrder[] {
    return this.liveOrdersState();
  }

  pushMockOrder(order: VendorOrder): void {
    this.upsertLiveOrder(order);
    this.mockOrderStream$.next(order);
  }

  createMockIncomingOrder(): VendorOrder {
    mockSeq += 1;
    const now = new Date().toISOString();
    return {
      id: `ord-${mockSeq}`,
      orderNumber: `#${mockSeq}`,
      customerName: 'عميل كومبو',
      status: 'pending',
      total: 85 + (mockSeq % 5) * 12,
      itemCount: 2 + (mockSeq % 3),
      items: [
        { productId: 'p1', name: 'ساندwich مشكل', quantity: 1, unitPrice: 45 },
        { productId: 'p2', name: 'عصير برتقال', quantity: 1, unitPrice: 25 },
      ],
      notes: mockSeq % 2 === 0 ? 'بدون بصل' : undefined,
      createdAt: now,
      updatedAt: now,
    };
  }

  normalizeIncoming(payload: unknown): VendorOrder | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const row = payload as Partial<VendorOrder>;
    if (!row.id || !row.orderNumber) {
      return null;
    }
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      customerName: row.customerName ?? 'عميل',
      status: row.status ?? 'pending',
      total: row.total ?? 0,
      itemCount: row.itemCount ?? row.items?.length ?? 0,
      items: row.items ?? [],
      notes: row.notes,
      createdAt: row.createdAt ?? new Date().toISOString(),
      updatedAt: row.updatedAt ?? new Date().toISOString(),
    };
  }
}

function seedLiveOrders(): VendorOrder[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'ord-1001',
      orderNumber: '#1001',
      customerName: 'سارة محمود',
      status: 'pending',
      total: 128,
      itemCount: 3,
      items: [
        { productId: 'p3', name: 'كروissant', quantity: 2, unitPrice: 18 },
        { productId: 'p4', name: 'قهوة', quantity: 1, unitPrice: 92 },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'ord-1002',
      orderNumber: '#1002',
      customerName: 'كريم حسن',
      status: 'preparing',
      total: 64,
      itemCount: 2,
      items: [{ productId: 'p5', name: 'فطيرة جبن', quantity: 2, unitPrice: 32 }],
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function seedHistoryOrders(): VendorOrder[] {
  const day = new Date();
  day.setDate(day.getDate() - 1);
  const createdAt = day.toISOString();
  return [
    {
      id: 'ord-900',
      orderNumber: '#900',
      customerName: 'ليلى',
      status: 'completed',
      total: 210,
      itemCount: 4,
      items: [],
      createdAt,
      updatedAt: createdAt,
    },
    {
      id: 'ord-901',
      orderNumber: '#901',
      customerName: 'يوسف',
      status: 'cancelled',
      total: 55,
      itemCount: 1,
      items: [],
      createdAt,
      updatedAt: createdAt,
    },
  ];
}
