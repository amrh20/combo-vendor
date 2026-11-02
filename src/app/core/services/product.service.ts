import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '../api-config';
import { LIST_PAGE_SIZE } from '../list-page';
import {
  ProductListPage,
  ProductUpdatePayload,
  ProductWritePayload,
  VendorCatalogProduct,
} from '../models/catalog-product.model';

const PRODUCTS_URL = `${API_BASE_URL}/v1/store/products`;

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  /** `GET /v1/store/products?limit=10`, optionally `cursor` for the next page. */
  list(cursor?: string): Observable<ProductListPage> {
    return this.http
      .get<ProductListPage>(PRODUCTS_URL, {
        params: {
          limit: String(LIST_PAGE_SIZE),
          ...(cursor ? { cursor } : {}),
        },
      })
      .pipe(map((page) => ({ items: page.items.map(normalizeProduct), nextCursor: page.nextCursor })));
  }

  getProduct(id: string): Observable<VendorCatalogProduct> {
    return this.http.get<VendorCatalogProduct>(`${PRODUCTS_URL}/${id}`).pipe(map(normalizeProduct));
  }

  createProduct(payload: ProductWritePayload): Observable<VendorCatalogProduct> {
    return this.http.post<VendorCatalogProduct>(PRODUCTS_URL, payload).pipe(map(normalizeProduct));
  }

  updateProduct(id: string, payload: ProductUpdatePayload): Observable<VendorCatalogProduct> {
    return this.http.patch<VendorCatalogProduct>(`${PRODUCTS_URL}/${id}`, payload).pipe(map(normalizeProduct));
  }

  /** `PATCH /v1/store/products/:id/availability` with `{ isAvailable }`. Any shop role. */
  setAvailability(id: string, isAvailable: boolean): Observable<VendorCatalogProduct> {
    return this.http
      .patch<VendorCatalogProduct>(`${PRODUCTS_URL}/${id}/availability`, { isAvailable })
      .pipe(map(normalizeProduct));
  }
}

export function displayImage(url: string): string {
  const raw = url.trim();
  if (!raw) {
    return '';
  }
  return raw.startsWith('/') ? `${API_BASE_URL}${raw}` : raw;
}

/** Fill fields the list and form expect when the store API omits them. */
const DEFAULT_PREPARATION_MINUTES = 10;

function normalizePreparationMinutes(value: number | undefined | null): number {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 1 ? minutes : DEFAULT_PREPARATION_MINUTES;
}

function normalizeProduct(raw: VendorCatalogProduct): VendorCatalogProduct {
  const images = (raw.images ?? []).map((image) => image.trim()).filter(Boolean);
  const shopCategoryId = raw.shopCategoryId ?? raw.sectionId ?? null;
  return {
    ...raw,
    shopCategoryId,
    sectionId: raw.sectionId || shopCategoryId || '',
    name: raw.name ?? '',
    description: raw.description ?? '',
    images,
    imageUrl: images[0] ? displayImage(images[0]) : displayImage(raw.imageUrl ?? ''),
    isAvailable: raw.isAvailable === true,
    isNew: raw.isNew === true,
    preparationMinutes: normalizePreparationMinutes(raw.preparationMinutes),
    pricePiastres: raw.pricePiastres ?? 0,
    oldPricePiastres: raw.oldPricePiastres ?? null,
    sectionName: raw.sectionName ?? '',
    variants: raw.variants ?? [],
    specifications: raw.specifications ?? [],
    updatedAt: raw.updatedAt ?? raw.createdAt ?? new Date().toISOString(),
  };
}
