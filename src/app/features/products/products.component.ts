import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { VendorCatalogProduct } from '../../core/models/catalog-product.model';
import { ProductService } from '../../core/services/product.service';

@Component({
  selector: 'vnd-products',
  standalone: true,
  imports: [FormsModule, DecimalPipe, ToggleSwitch],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class ProductsComponent {
  private readonly productsApi = inject(ProductService);
  private readonly router = inject(Router);

  readonly currency = 'ج.م';
  readonly loading = signal(true);
  readonly rows = signal<VendorCatalogProduct[]>([]);

  readonly availableCount = computed(
    () => this.rows().filter((product) => product.isAvailable && product.inStock).length,
  );

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.productsApi.list().subscribe({
      next: (items) => {
        this.rows.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isListed(product: VendorCatalogProduct): boolean {
    return product.isAvailable && product.inStock;
  }

  toggleActive(product: VendorCatalogProduct, isAvailable: boolean): void {
    this.productsApi.setActive(product.id, isAvailable).subscribe({
      next: (updated) => this.patchRow(updated),
    });
  }

  toggleStock(product: VendorCatalogProduct, inStock: boolean): void {
    this.productsApi.setInStock(product.id, inStock).subscribe({
      next: (updated) => this.patchRow(updated),
    });
  }

  openCreate(): void {
    void this.router.navigate(['/products/create']);
  }

  openEdit(product: VendorCatalogProduct): void {
    void this.router.navigate(['/products', product.id, 'edit']);
  }

  private patchRow(updated: VendorCatalogProduct): void {
    this.rows.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  }
}
