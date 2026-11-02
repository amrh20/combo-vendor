import { Component, input, output } from '@angular/core';

@Component({
  selector: 'vnd-pagination',
  standalone: true,
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly hasNext = input(false);
  readonly disabled = input(false);

  readonly pageChange = output<number>();

  previous(): void {
    const page = this.page();
    if (this.disabled() || page <= 1) {
      return;
    }
    this.pageChange.emit(page - 1);
  }

  next(): void {
    if (this.disabled() || !this.hasNext()) {
      return;
    }
    this.pageChange.emit(this.page() + 1);
  }
}
