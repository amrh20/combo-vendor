import { Injectable, NgZone, effect, inject } from '@angular/core';
import { Observable, Subject, filter, interval, map, share, takeUntil } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, USE_MOCK_API } from '../api-config';
import { VendorOrder } from '../models/order.model';
import { AuthService } from './auth.service';
import { OrderService } from './order.service';

/** Vendor realtime channel — `order:created` for new KDS tickets. */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);
  private readonly orders = inject(OrderService);

  private socket: Socket | null = null;
  private readonly mockStop$ = new Subject<void>();
  private mockStarted = false;

  /** Emits normalized orders from the socket (or mock simulator). */
  readonly incomingOrder$: Observable<VendorOrder>;

  constructor() {
    this.incomingOrder$ = USE_MOCK_API ? this.mockIncoming$() : this.liveIncoming$();

    effect(() => {
      if (!this.auth.isAuthenticated()) {
        this.disconnect();
        return;
      }
      if (USE_MOCK_API) {
        this.startMockFeed();
        return;
      }
      this.connectLive();
    });
  }

  connect(): void {
    if (USE_MOCK_API) {
      this.startMockFeed();
      return;
    }
    this.connectLive();
  }

  disconnect(): void {
    this.mockStop$.next();
    this.mockStarted = false;
    this.socket?.disconnect();
    this.socket = null;
  }

  on<T>(event: string): Observable<T> {
    return new Observable<T>((subscriber) => {
      if (!this.socket) {
        subscriber.complete();
        return;
      }
      const handler = (payload: T) => this.zone.run(() => subscriber.next(payload));
      this.socket.on(event, handler);
      return () => this.socket?.off(event, handler);
    });
  }

  private connectLive(): void {
    if (this.socket?.connected) {
      return;
    }
    this.socket = io(`${API_BASE_URL}/vendor`, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      auth: (cb) => {
        cb({ token: this.auth.accessToken() ?? '' });
      },
    });
  }

  private liveIncoming$(): Observable<VendorOrder> {
    return new Observable<VendorOrder>((subscriber) => {
      const handler = (payload: unknown) => {
        const order = this.orders.normalizeIncoming(payload);
        if (order) {
          this.zone.run(() => subscriber.next(order));
        }
      };
      const attach = () => this.socket?.on('order:created', handler);
      attach();
      return () => this.socket?.off('order:created', handler);
    }).pipe(share());
  }

  private mockIncoming$(): Observable<VendorOrder> {
    return new Observable<VendorOrder>((subscriber) => {
      const sub = this.orders.mockOrderStream$.subscribe((order) => subscriber.next(order));
      return () => sub.unsubscribe();
    }).pipe(share());
  }

  /** Demo: inject a new order every ~45s while signed in. */
  private startMockFeed(): void {
    if (this.mockStarted) {
      return;
    }
    this.mockStarted = true;
    interval(45_000)
      .pipe(
        takeUntil(this.mockStop$),
        filter(() => this.auth.isAuthenticated()),
        map(() => this.orders.createMockIncomingOrder()),
      )
      .subscribe((order) => this.orders.pushMockOrder(order));
  }
}
