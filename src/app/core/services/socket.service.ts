import { Injectable, NgZone, effect, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StoreOrderEvent } from '../models/order.model';
import { AuthService } from './auth.service';

const CLOSE_UNAUTHORIZED = 4401;
const CLOSE_FORBIDDEN = 4403;
const RETRY_START_MS = 1000;
const RETRY_MAX_MS = 30_000;

interface RealtimeEnvelope {
  event?: string;
  id?: string;
  occurredAt?: string;
  data?: StoreOrderEvent['data'];
}

/** Native WebSocket to `/v1/realtime`. REST stays the source of order data. */
@Injectable({ providedIn: 'root' })
export class SocketService {
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);

  private socket: WebSocket | null = null;
  private stopped = true;
  private refreshing = false;
  private retryMs = RETRY_START_MS;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly seen = new Set<string>();

  /** `off` before login, `live` after `ready`, `retrying` while reconnecting. */
  readonly status = signal<'off' | 'live' | 'retrying'>('off');
  /** Fires after every successful connection, including reconnects. */
  readonly connected$ = new Subject<void>();
  /** `order.created` and `order.updated`, deduped by event id. */
  readonly orderEvents$ = new Subject<StoreOrderEvent>();

  constructor() {
    effect(() => {
      if (!this.auth.isAuthenticated()) {
        this.disconnect();
        return;
      }
      this.connect();
    });
  }

  connect(): void {
    this.stopped = false;
    this.open();
  }

  disconnect(): void {
    this.stopped = true;
    this.refreshing = false;
    this.status.set('off');
    this.clearRetry();
    const socket = this.socket;
    this.socket = null;
    socket?.close(1000);
  }

  private open(): void {
    if (this.stopped || this.socket) {
      return;
    }
    const token = this.auth.accessToken();
    if (!token || token.startsWith('mock-')) {
      return;
    }

    const socket = new WebSocket(realtimeUrl(token));
    this.socket = socket;

    socket.onmessage = (raw) => {
      const message = parseEnvelope(raw.data);
      if (!message?.event) {
        return;
      }
      this.zone.run(() => {
        if (message.event === 'ready') {
          this.retryMs = RETRY_START_MS;
          this.status.set('live');
          this.connected$.next();
          return;
        }
        if (
          (message.event === 'order.created' || message.event === 'order.updated') &&
          message.data?.subOrderId
        ) {
          const eventId = message.id ?? `${message.event}:${message.data.subOrderId}:${message.occurredAt ?? ''}`;
          if (this.seen.has(eventId)) {
            return;
          }
          if (this.seen.size > 2000) {
            this.seen.clear();
          }
          this.seen.add(eventId);
          this.orderEvents$.next({
            event: message.event,
            id: eventId,
            occurredAt: message.occurredAt ?? new Date().toISOString(),
            data: message.data,
          });
        }
      });
    };

    socket.onclose = (closed) => {
      if (this.socket !== socket) {
        return;
      }
      this.socket = null;
      this.handleClose(closed.code);
    };
  }

  private handleClose(code: number): void {
    if (this.stopped || code === CLOSE_FORBIDDEN) {
      return;
    }
    if (code === CLOSE_UNAUTHORIZED) {
      this.refreshAndReconnect();
      return;
    }
    this.status.set('retrying');
    this.clearRetry();
    const delay = this.retryMs;
    this.retryMs = Math.min(this.retryMs * 2, RETRY_MAX_MS);
    this.retryTimer = setTimeout(() => this.open(), delay);
  }

  private refreshAndReconnect(): void {
    if (this.refreshing || this.stopped) {
      return;
    }
    this.refreshing = true;
    this.auth.refreshToken().subscribe({
      next: () => {
        this.refreshing = false;
        this.open();
      },
      error: () => {
        this.refreshing = false;
        this.auth.logout();
      },
    });
  }

  private clearRetry(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }
}

function realtimeUrl(token: string): string {
  const base = environment.apiUrl.replace(/^http/, 'ws');
  return `${base}/v1/realtime?access_token=${encodeURIComponent(token)}`;
}

function parseEnvelope(data: unknown): RealtimeEnvelope | null {
  if (typeof data !== 'string') {
    return null;
  }
  try {
    const parsed = JSON.parse(data) as RealtimeEnvelope;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}
