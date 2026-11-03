import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  StoreStatsPeriod,
  StoreStatsResponse,
  StoreStatsSummary,
} from '../models/store-stats.model';

const STATS_URL = `${environment.apiUrl}/v1/store/stats`;

const ZERO_SUMMARY: StoreStatsSummary = {
  totalOrders: 0,
  deliveredOrders: 0,
  cancelledOrders: 0,
  netSalesPiastres: 0,
};

@Injectable({ providedIn: 'root' })
export class VendorStatsService {
  private readonly http = inject(HttpClient);

  getStats(period: StoreStatsPeriod = 'today'): Observable<StoreStatsResponse> {
    return this.http
      .get<unknown>(STATS_URL, { params: { period } })
      .pipe(map((body) => normalizeStoreStats(body, period)));
  }
}

export function emptyStoreStats(period: StoreStatsPeriod): StoreStatsResponse {
  return {
    period,
    summary: { ...ZERO_SUMMARY },
    chartData: [],
    topProducts: [],
    recentOrders: [],
  };
}

function normalizeStoreStats(body: unknown, fallbackPeriod: StoreStatsPeriod): StoreStatsResponse {
  const record = asRecord(body);
  const period = parsePeriod(record['period'], fallbackPeriod);
  const summarySource = asRecord(record['summary'] ?? record);

  const summary: StoreStatsSummary = {
    totalOrders: numberField(summarySource, 'totalOrders', 'total_orders'),
    deliveredOrders: numberField(summarySource, 'deliveredOrders', 'delivered_orders'),
    cancelledOrders: numberField(summarySource, 'cancelledOrders', 'cancelled_orders'),
    netSalesPiastres: numberField(summarySource, 'netSalesPiastres', 'net_sales_piastres'),
  };

  const chartRaw = record['chartData'] ?? record['chart_data'];
  const chartData = Array.isArray(chartRaw)
    ? chartRaw.map((point) => {
        const row = asRecord(point);
        return {
          label: stringField(row, 'label'),
          salesPiastres: numberField(row, 'salesPiastres', 'sales_piastres'),
          orderCount: numberField(row, 'orderCount', 'order_count'),
        };
      })
    : [];

  const topRaw = record['topProducts'] ?? record['top_products'];
  const topProducts = Array.isArray(topRaw)
    ? topRaw.map((item) => {
        const row = asRecord(item);
        return {
          productId: stringField(row, 'productId', 'product_id'),
          name: stringField(row, 'name'),
          quantitySold: numberField(row, 'quantitySold', 'quantity_sold'),
          revenuePiastres: numberField(row, 'revenuePiastres', 'revenue_piastres'),
        };
      })
    : [];

  const recentRaw = record['recentOrders'] ?? record['recent_orders'];
  const recentOrders = Array.isArray(recentRaw)
    ? recentRaw.map((item) => {
        const row = asRecord(item);
        return {
          id: stringField(row, 'id'),
          orderNumber: stringField(row, 'orderNumber', 'order_number'),
          status: row['status'] as StoreStatsResponse['recentOrders'][number]['status'],
          totalPiastres: numberField(row, 'totalPiastres', 'total_piastres'),
          placedAt: stringField(row, 'placedAt', 'placed_at'),
        };
      })
    : [];

  return { period, summary, chartData, topProducts, recentOrders };
}

function parsePeriod(value: unknown, fallback: StoreStatsPeriod): StoreStatsPeriod {
  if (value === 'today' || value === 'week' || value === 'month' || value === 'year') {
    return value;
  }
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function numberField(record: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
}

function stringField(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') {
      return value;
    }
  }
  return '';
}
