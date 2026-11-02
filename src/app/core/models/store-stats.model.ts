import { SubOrderStatus } from './order.model';

/** `GET /v1/store/stats?period=today|week|month|year` (Cairo boundaries). */
export type StoreStatsPeriod = 'today' | 'week' | 'month' | 'year';

export interface StoreStatsSummary {
  totalOrders: number;
  deliveredOrders: number;
  /** `REJECTED` + `CANCELLED`. */
  cancelledOrders: number;
  /** Payable piastres for `DELIVERED` parts in the period. */
  netSalesPiastres: number;
}

export interface StoreStatsChartPoint {
  label: string;
  salesPiastres: number;
  orderCount: number;
}

export interface StoreStatsTopProduct {
  productId: string;
  name: string;
  quantitySold: number;
  revenuePiastres: number;
}

export interface StoreStatsRecentOrder {
  id: string;
  orderNumber: string;
  status: SubOrderStatus;
  totalPiastres: number;
  placedAt: string;
}

export interface StoreStatsResponse {
  period: StoreStatsPeriod;
  summary: StoreStatsSummary;
  chartData: StoreStatsChartPoint[];
  topProducts: StoreStatsTopProduct[];
  recentOrders: StoreStatsRecentOrder[];
}
