import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { PayoutRecord, WalletSummary } from '../models/wallet.model';

const WALLET_URL = `${API_BASE_URL}/v1/vendor/wallet`;

@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly http = inject(HttpClient);

  getSummary(): Observable<WalletSummary> {
    return this.http.get<WalletSummary>(WALLET_URL);
  }

  listPayouts(): Observable<PayoutRecord[]> {
    return this.http.get<PayoutRecord[]>(`${WALLET_URL}/payouts`);
  }
}
