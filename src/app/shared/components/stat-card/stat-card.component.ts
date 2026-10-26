import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
  selector: 'vnd-stat-card',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.scss',
})
export class StatCardComponent {
  label = input.required<string>();
  value = input.required<number>();
  suffix = input<string>('');
  icon = input<string>('pi-chart-line');
  accent = input<'primary' | 'success' | 'warning' | 'danger'>('primary');
}
