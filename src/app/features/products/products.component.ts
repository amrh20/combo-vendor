import { DecimalPipe, NgIf } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { VendorCatalogProduct } from '../../core/models/catalog-product.model';
import { piastresToEgp } from '../../core/models/money.model';
import { AuthService } from '../../core/services/auth.service';
import { ProductService, displayImage } from '../../core/services/product.service';
import { ToastService } from '../../core/services/toast.service';
import { apiErrorMessage } from '../../core/utils/api-error';
import { CursorPages } from '../../shared/components/pagination/cursor-pages';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'vnd-products',
  standalone: true,
  imports: [FormsModule, DecimalPipe, NgIf, ToggleSwitch, PaginationComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class ProductsComponent {
  private readonly productsApi = inject(ProductService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly currency = 'ج.م';
  readonly egp = piastresToEgp;
  readonly loading = signal(true);
  readonly paging = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly rows = signal<VendorCatalogProduct[]>([]);
  readonly page = signal(1);
  readonly hasNext = signal(false);
  private readonly pages = new CursorPages();
  private readonly pending = signal<ReadonlySet<string>>(new Set());

  readonly canManageCatalog = this.auth.canManageCatalog;

  /** Shown when add/edit actions are hidden by role or store settings. */
  readonly catalogActionsHint = computed(() => {
    if (this.canManageCatalog()) {
      return null;
    }
    const user = this.auth.currentUser();
    if (!user) {
      return null;
    }
    if (user.role === 'CASHIER') {
      return 'إضافة وتعديل المنتجات للمدير فقط. حسابك مسجّل ككاشير — تقدر تغيّر «متاح» بس.';
    }
    return 'إضافة وتعديل المنتجات مخفية لأن تعديل الكتالوج غير مفعّل للمتجر. تواصل مع كومبو لتفعيلها.';
  });

  availableCount(): number {
    return this.rows().filter((product) => product.isAvailable).length;
  }

  constructor() {
    this.auth.loadUserProfile().subscribe();
    this.fetchPage(1);
  }

  /** Reload from the first page (refresh). */
  load(): void {
    if (this.loading() || this.paging()) {
      return;
    }
    this.pages.reset();
    this.page.set(1);
    this.hasNext.set(false);
    this.fetchPage(1);
  }

  goTo(page: number): void {
    if (this.loading() || this.paging() || !this.pages.canOpen(page, this.page(), this.hasNext())) {
      return;
    }
    this.fetchPage(page);
  }

  private fetchPage(page: number): void {
    const initial = this.rows().length === 0;
    if (initial) {
      this.loading.set(true);
      this.loadError.set(null);
    } else {
      this.paging.set(true);
    }

    this.productsApi.list(this.pages.cursorFor(page)).subscribe({
      next: (result) => {
        this.rows.set(result.items);
        this.pages.remember(page, result.nextCursor);
        this.page.set(page);
        this.hasNext.set(result.nextCursor != null);
        this.loading.set(false);
        this.paging.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.paging.set(false);
        const message = apiErrorMessage(error, 'تعذر تحميل المنتجات.');
        if (initial) {
          this.loadError.set(message);
        }
        this.toast.show({
          title: 'تعذر التحميل',
          body: message,
          variant: 'danger',
        });
      },
    });
  }

  cover(product: VendorCatalogProduct): string {
    return displayImage(product.images[0] || product.imageUrl || '');
  }

  isPending(id: string): boolean {
    return this.pending().has(id);
  }

  toggleActive(product: VendorCatalogProduct, isAvailable: boolean): void {
    if (this.pending().has(product.id) || product.isAvailable === isAvailable) {
      return;
    }
    const previous = product.isAvailable;
    this.markPending(product.id, true);
    this.patchAvailability(product.id, isAvailable);
    this.productsApi.setAvailability(product.id, isAvailable).subscribe({
      next: (updated) => {
        this.patchRow(updated);
        this.markPending(product.id, false);
      },
      error: (error: unknown) => {
        this.patchAvailability(product.id, previous);
        this.markPending(product.id, false);
        this.toast.show({
          title: 'تعذر التحديث',
          body: apiErrorMessage(error, 'تعذر تحديث توفر المنتج.'),
          variant: 'danger',
        });
      },
    });
  }

  openCreate(): void {
    if (!this.canManageCatalog()) {
      return;
    }
    void this.router.navigate(['/products/create']);
  }

  openEdit(product: VendorCatalogProduct): void {
    if (!this.canManageCatalog()) {
      return;
    }
    void this.router.navigate(['/products', product.id, 'edit']);
  }

  private patchRow(updated: VendorCatalogProduct): void {
    this.rows.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
  }

  private patchAvailability(id: string, isAvailable: boolean): void {
    this.rows.update((items) =>
      items.map((item) => (item.id === id ? { ...item, isAvailable } : item)),
    );
  }

  private markPending(id: string, pending: boolean): void {
    this.pending.update((ids) => {
      const next = new Set(ids);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }
}
