export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface WalletSummary {
  availableBalance: number;
  pendingBalance: number;
  totalSales: number;
  platformCommission: number;
  currency: string;
}

export interface PayoutRecord {
  id: string;
  amount: number;
  status: PayoutStatus;
  periodLabel: string;
  requestedAt: string;
  completedAt?: string;
}
