import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PayoutRecord, WalletSummary } from '../models/wallet.model';

const WALLET_URL = `${environment.apiUrl}/v1/vendor/wallet`;

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
