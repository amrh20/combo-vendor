import { DecimalPipe } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, viewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

Chart.register(...registerables);

interface TopProduct {
  name: string;
  orders: number;
  revenue: number;
}

@Component({
  selector: 'vnd-dashboard',
  standalone: true,
  imports: [DecimalPipe, StatCardComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements AfterViewInit {
  private readonly chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('salesChart');

  readonly todaySales = 8420;
  readonly activeOrders = 7;
  readonly completedOrders = 34;
  readonly cancelledOrders = 2;

  readonly topProducts: TopProduct[] = [
    { name: 'ساندwich مشكل', orders: 42, revenue: 1890 },
    { name: 'كروissant', orders: 36, revenue: 792 },
    { name: 'قهوة تركي', orders: 28, revenue: 504 },
  ];

  ngAfterViewInit(): void {
    const canvas = this.chartCanvas()?.nativeElement;
    if (!canvas) {
      return;
    }

    const primary =
      getComputedStyle(document.documentElement)
        .getPropertyValue('--Combo-button-button-background-primary-default')
        .trim() || '#00AA89';

    new Chart(canvas, {
      type: 'line',
      data: {
        labels: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'],
        datasets: [
          {
            label: 'المبيعات (ج.م)',
            data: [5200, 6100, 5800, 7200, 8420, 7900, 6800],
            borderColor: primary,
            backgroundColor: primary.length === 7 ? `${primary}24` : 'rgba(0, 170, 137, 0.14)',
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.06)' } },
          x: { grid: { display: false } },
        },
      },
    });
  }
}
