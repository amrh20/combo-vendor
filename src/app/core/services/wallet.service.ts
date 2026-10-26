import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, delay, of } from 'rxjs';
import { API_BASE_URL, USE_MOCK_API } from '../api-config';
import { PayoutRecord, WalletSummary } from '../models/wallet.model';

const WALLET_URL = `${API_BASE_URL}/v1/vendor/wallet`;

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly http = inject(HttpClient);

  getSummary(): Observable<WalletSummary> {
    if (USE_MOCK_API) {
      return of({
        availableBalance: 12450,
        pendingBalance: 3200,
        totalSales: 89200,
        platformCommission: 8920,
        currency: 'EGP',
      }).pipe(delay(150));
    }
    return this.http.get<WalletSummary>(WALLET_URL);
  }

  listPayouts(): Observable<PayoutRecord[]> {
    if (USE_MOCK_API) {
      const mock: PayoutRecord[] = [
        {
          id: 'pay-1',
          amount: 8500,
          status: 'pending',
          periodLabel: '1–15 أكتوبر',
          requestedAt: new Date().toISOString(),
        },
        {
          id: 'pay-2',
          amount: 9200,
          status: 'completed',
          periodLabel: '16–30 سبتمبر',
          requestedAt: '2025-09-16T10:00:00.000Z',
          completedAt: '2025-10-01T14:22:00.000Z',
        },
      ];
      return of(mock).pipe(delay(150));
    }
    return this.http.get<PayoutRecord[]>(`${WALLET_URL}/payouts`);
  }
}
