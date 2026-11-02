import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { EMPTY, Observable, expand, filter, of, reduce, tap, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { API_BASE_URL } from '../api-config';
import { LIST_PAGE_SIZE } from '../list-page';
import { CursorPage, LIVE_ORDER_STATUSES, StoreOrder, SubOrderStatus } from '../models/order.model';
import { SocketService } from './socket.service';

const ORDERS_URL = `${API_BASE_URL}/v1/store/orders`;
const LIVE_STATUSES = new Set<SubOrderStatus>(LIVE_ORDER_STATUSES);

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly socket = inject(SocketService);
  private readonly liveOrdersState = signal<StoreOrder[]>([]);
  /** Drops a `listLive` response that finished after a newer load or a socket refresh. */
  private liveGeneration = 0;

  readonly liveOrders = this.liveOrdersState.asReadonly();
  readonly lateOrderIds = signal<ReadonlySet<string>>(new Set());

  constructor() {
    this.socket.orderEvents$
      .pipe(filter((event) => event.event === 'order.created' || event.event === 'order.updated'))
      .subscribe((event) => {
        const id = event.data.subOrderId;
        if (!id) {
          return;
        }
        this.refreshOne(id).subscribe({ error: () => undefined });
      });
  }

  /** `GET /v1/store/orders?view=live`, following the cursor until the board is complete. */
  listLive(): Observable<StoreOrder[]> {
    const generation = ++this.liveGeneration;
    return this.collect('live').pipe(
      tap((orders) => {
        if (generation === this.liveGeneration) {
          this.liveOrdersState.set(orders);
        }
      }),
    );
  }

  /** `GET /v1/store/orders?view=history` (paginated; sort client-side by `placedAt` desc). */
  listHistory(cursor?: string): Observable<CursorPage<StoreOrder>> {
    return this.fetchPage('history', cursor);
  }

  /** `GET /v1/store/orders/{id}` and keep the live board in sync. */
  refreshOne(id: string): Observable<StoreOrder | null> {
    return this.http.get<StoreOrder>(`${ORDERS_URL}/${id}`).pipe(
      tap((order) => this.applyLive(order)),
      catchError((error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.removeLive(id);
          return of(null);
        }
        return throwError(() => error);
      }),
    );
  }

  /** `POST /v1/store/orders/{id}/accept` */
  accept(id: string, unavailableItemIds: string[] = []): Observable<StoreOrder> {
    return this.http
      .post<StoreOrder>(
        `${ORDERS_URL}/${id}/accept`,
        { unavailableItemIds },
        { headers: this.idempotency() },
      )
      .pipe(tap((order) => this.applyLive(order)));
  }

  /** `POST /v1/store/orders/{id}/reject` */
  reject(id: string, reason: string): Observable<StoreOrder> {
    return this.http
      .post<StoreOrder>(`${ORDERS_URL}/${id}/reject`, { reason }, { headers: this.idempotency() })
      .pipe(tap((order) => this.applyLive(order)));
  }

  /** `POST /v1/store/orders/{id}/ready` */
  ready(id: string): Observable<StoreOrder> {
    return this.http
      .post<StoreOrder>(`${ORDERS_URL}/${id}/ready`, {}, { headers: this.idempotency() })
      .pipe(tap((order) => this.applyLive(order)));
  }

  markLate(id: string): void {
    this.lateOrderIds.update((ids) => {
      if (ids.has(id)) {
        return ids;
      }
      const next = new Set(ids);
      next.add(id);
      return next;
    });
  }

  liveSnapshot(): StoreOrder[] {
    return this.liveOrdersState();
  }

  private fetchPage(
    view: 'live' | 'history',
    cursor?: string,
  ): Observable<CursorPage<StoreOrder>> {
    return this.http.get<CursorPage<StoreOrder>>(ORDERS_URL, {
      params: {
        view,
        limit: String(LIST_PAGE_SIZE),
        ...(cursor ? { cursor } : {}),
      },
    });
  }

  private collect(view: 'live' | 'history'): Observable<StoreOrder[]> {
    const load = (cursor?: string) => this.fetchPage(view, cursor);

    return load().pipe(
      expand((page) => (page.nextCursor ? load(page.nextCursor) : EMPTY)),
      reduce((all, page) => all.concat(page.items), [] as StoreOrder[]),
    );
  }

  private applyLive(order: StoreOrder): void {
    this.liveGeneration++;
    if (!LIVE_STATUSES.has(order.status)) {
      this.removeLive(order.id);
      return;
    }
    if (order.status !== 'PENDING') {
      this.clearLate(order.id);
    }
    this.liveOrdersState.update((orders) => {
      const without = orders.filter((item) => item.id !== order.id);
      return [...without, order].sort((a, b) => a.placedAt.localeCompare(b.placedAt));
    });
  }

  private removeLive(id: string): void {
    this.liveGeneration++;
    this.clearLate(id);
    this.liveOrdersState.update((orders) => orders.filter((order) => order.id !== id));
  }

  private clearLate(id: string): void {
    this.lateOrderIds.update((ids) => {
      if (!ids.has(id)) {
        return ids;
      }
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }

  private idempotency(): Record<string, string> {
    return { 'Idempotency-Key': crypto.randomUUID() };
  }
}
