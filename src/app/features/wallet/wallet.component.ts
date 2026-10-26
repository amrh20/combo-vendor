import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { PayoutRecord, WalletSummary } from '../../core/models/wallet.model';
import { WalletService } from '../../core/services/wallet.service';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'vnd-wallet',
  standalone: true,
  imports: [DecimalPipe, DatePipe, StatCardComponent],
  templateUrl: './wallet.component.html',
  styleUrl: './wallet.component.scss',
})
export class WalletComponent {
  private readonly walletApi = inject(WalletService);

  readonly loading = signal(true);
  readonly summary = signal<WalletSummary | null>(null);
  readonly payouts = signal<PayoutRecord[]>([]);

  constructor() {
    this.walletApi.getSummary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.walletApi.listPayouts().subscribe({
      next: (items) => this.payouts.set(items),
    });
  }

  payoutStatusLabel(status: PayoutRecord['status']): string {
    const labels: Record<PayoutRecord['status'], string> = {
      pending: 'قيد الانتظار',
      processing: 'قيد المعالجة',
      completed: 'مكتمل',
      failed: 'فشل',
    };
    return labels[status];
  }
}
