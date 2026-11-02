import { DatePipe, DecimalPipe } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { SUB_ORDER_STATUS_LABELS, SubOrderStatus } from '../../core/models/order.model';
import { piastresToEgp } from '../../core/models/money.model';
import { StoreStatsPeriod, StoreStatsResponse } from '../../core/models/store-stats.model';
import {
  VendorStatsService,
  emptyStoreStats,
} from '../../core/services/vendor-stats.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

Chart.register(...registerables);

const PERIOD_OPTIONS: { value: StoreStatsPeriod; label: string; chartTitle: string }[] = [
  { value: 'today', label: 'اليوم', chartTitle: 'مبيعات اليوم' },
  { value: 'week', label: 'هذا الأسبوع', chartTitle: 'مبيعات الأسبوع' },
  { value: 'month', label: 'هذا الشهر', chartTitle: 'مبيعات الشهر' },
  { value: 'year', label: 'هذا العام', chartTitle: 'مبيعات السنة' },
];

@Component({
  selector: 'vnd-dashboard',
  standalone: true,
  imports: [DatePipe, DecimalPipe, StatCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  private readonly statsService = inject(VendorStatsService);
  private readonly toast = inject(ToastService);

  @ViewChild('salesChart') private chartCanvas?: ElementRef<HTMLCanvasElement>;

  readonly periodOptions = PERIOD_OPTIONS;
  readonly period = signal<StoreStatsPeriod>('today');
  readonly loading = signal(true);
  readonly stats = signal<StoreStatsResponse | null>(null);
  readonly viewStats = computed(() => this.stats() ?? emptyStoreStats(this.period()));
  readonly chartHasSales = computed(() =>
    this.viewStats().chartData.some((point) => point.salesPiastres > 0),
  );
  readonly egp = piastresToEgp;

  private chart: Chart<'line'> | null = null;
  private chartOrderCounts: number[] = [];

  ngAfterViewInit(): void {
    this.loadStats();
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  setPeriod(period: StoreStatsPeriod): void {
    if (period === this.period()) {
      return;
    }
    this.period.set(period);
    this.loadStats();
  }

  chartTitle(): string {
    return PERIOD_OPTIONS.find((o) => o.value === this.period())?.chartTitle ?? 'المبيعات';
  }

  statusLabel(status: SubOrderStatus): string {
    return SUB_ORDER_STATUS_LABELS[status] ?? status;
  }

  statusBadgeClass(status: SubOrderStatus): string {
    switch (status) {
      case 'DELIVERED':
        return 'text-bg-success';
      case 'REJECTED':
        return 'text-bg-danger';
      case 'CANCELLED':
        return 'text-bg-secondary';
      case 'PENDING':
      case 'PREPARING':
      case 'READY_FOR_PICKUP':
        return 'text-bg-warning';
      default:
        return 'text-bg-light border';
    }
  }

  private loadStats(): void {
    this.loading.set(true);
    this.statsService.getStats(this.period()).subscribe({
      next: (response) => {
        this.stats.set(response);
        this.loading.set(false);
        setTimeout(() => this.renderChart(response));
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.stats.set(null);
        this.destroyChart();
        this.toast.show({
          title: 'تعذر التحميل',
          body: apiErrorMessage(error, 'تعذر تحميل إحصائيات لوحة التحكم.'),
          variant: 'danger',
        });
      },
    });
  }

  private renderChart(response: StoreStatsResponse): void {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) {
      return;
    }

    const hasSales = response.chartData.some((point) => point.salesPiastres > 0);
    if (response.chartData.length === 0 || !hasSales) {
      this.destroyChart();
      return;
    }

    const labels = response.chartData.map((point) => point.label);
    const salesEgp = response.chartData.map((point) => piastresToEgp(point.salesPiastres));
    this.chartOrderCounts = response.chartData.map((point) => point.orderCount);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 280);
    gradient.addColorStop(0, 'rgba(13, 110, 253, 0.35)');
    gradient.addColorStop(1, 'rgba(13, 110, 253, 0)');

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'المبيعات (ج.م)',
            data: salesEgp,
            borderColor: 'rgb(13, 110, 253)',
            backgroundColor: gradient,
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
            pointBackgroundColor: 'rgb(13, 110, 253)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            rtl: true,
            textDirection: 'rtl',
            callbacks: {
              label: (item) => {
                const value = item.parsed.y;
                if (value == null) {
                  return '';
                }
                return `المبيعات: ${value.toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ج.م`;
              },
              afterLabel: (item) => {
                const count = this.chartOrderCounts[item.dataIndex] ?? 0;
                return `عدد الطلبات: ${count.toLocaleString('ar-EG')}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
          },
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) =>
                Number(value).toLocaleString('ar-EG', { maximumFractionDigits: 0 }),
            },
          },
        },
      },
    };

    if (this.chart) {
      this.chart.data.labels = labels;
      this.chart.data.datasets[0].data = salesEgp;
      this.chart.data.datasets[0].backgroundColor = gradient;
      this.chart.update();
      return;
    }

    this.chart = new Chart(canvas, config);
  }

  private destroyChart(): void {
    this.chart?.destroy();
    this.chart = null;
  }
}
