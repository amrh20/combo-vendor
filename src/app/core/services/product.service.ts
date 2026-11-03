import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LIST_PAGE_SIZE } from '../list-page';
import {
  ProductCombination,
  ProductListPage,
  ProductOption,
  ProductSpecification,
  ProductUpdatePayload,
  ProductVariant,
  ProductWritePayload,
  VendorCatalogProduct,
} from '../models/catalog-product.model';

const PRODUCTS_URL = `${environment.apiUrl}/v1/store/products`;

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);

  /** `GET /v1/store/products?limit=10`, optionally `cursor` for the next page. */
  list(cursor?: string): Observable<ProductListPage> {
    return this.http
      .get<unknown>(PRODUCTS_URL, {
        params: {
          limit: String(LIST_PAGE_SIZE),
          ...(cursor ? { cursor } : {}),
        },
      })
      .pipe(
        map((body) => ({
          items: unwrapProducts(body),
          nextCursor: readCursor(body),
        })),
      );
  }

  getProduct(id: string): Observable<VendorCatalogProduct> {
    return this.http.get<unknown>(`${PRODUCTS_URL}/${id}`).pipe(
      map((body) => {
        const product = parseProduct(body);
        if (!product) {
          throw new Error('Product response was empty');
        }
        return product;
      }),
    );
  }

  createProduct(payload: ProductWritePayload): Observable<VendorCatalogProduct> {
    return this.http
      .post<unknown>(PRODUCTS_URL, toApiBody(payload))
      .pipe(map((body) => parseProduct(body) ?? productFromPayload(payload)));
  }

  updateProduct(id: string, payload: ProductUpdatePayload): Observable<VendorCatalogProduct> {
    return this.http
      .patch<unknown>(`${PRODUCTS_URL}/${id}`, toApiBody(payload))
      .pipe(map((body) => parseProduct(body) ?? productFromPayload(payload, id)));
  }

  /** `PATCH /v1/store/products/:id/availability` with `{ isAvailable }`. Any shop role. */
  setAvailability(id: string, isAvailable: boolean): Observable<VendorCatalogProduct> {
    return this.http
      .patch<unknown>(`${PRODUCTS_URL}/${id}/availability`, { isAvailable })
      .pipe(
        map((body) => {
          const product = parseProduct(body);
          if (!product) {
            throw new Error('Product response was empty');
          }
          return product;
        }),
      );
  }
}

export function displayImage(url: string): string {
  const raw = url.trim();
  if (!raw) {
    return '';
  }
  return raw.startsWith('/') ? `${environment.apiUrl}${raw}` : raw;
}

/** Maps the form onto `POST/PATCH /v1/store/products`. */
function toApiBody(payload: ProductUpdatePayload): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (payload.name !== undefined) {
    body['name'] = payload.name.trim();
  }
  if (payload.description !== undefined) {
    body['description'] = payload.description.trim() || null;
  }
  if (payload.categoryIds !== undefined) {
    body['shopCategoryIds'] = payload.categoryIds.map((id) => id.trim()).filter(Boolean);
  }
  if (payload.pricePiastres !== undefined) {
    body['pricePiastres'] = payload.pricePiastres;
  }
  if (payload.oldPricePiastres !== undefined) {
    body['oldPricePiastres'] = payload.oldPricePiastres;
  }
  if (payload.isAvailable !== undefined) {
    body['isAvailable'] = payload.isAvailable;
  }
  if (payload.isNew !== undefined) {
    body['isNew'] = payload.isNew;
  }
  if (payload.images !== undefined) {
    body['images'] = payload.images.map((image) => image.trim()).filter(Boolean);
  }
  if (payload.variants !== undefined) {
    body['variants'] = payload.variants.map((variant) => ({
      ...(variant.id ? { id: variant.id } : {}),
      name: variant.name.trim(),
      options: variant.options.map((option) => ({
        ...(option.id ? { id: option.id } : {}),
        label: option.label.trim(),
        priceDeltaPiastres: option.priceDeltaPiastres,
      })),
    }));
  }
  if (payload.combinations !== undefined) {
    body['combinations'] = payload.combinations.map((combo) => ({
      skuMapping: combo.skuMapping,
      price: combo.pricePiastres,
      isAvailable: combo.isAvailable,
      stockQuantity: combo.stockQuantity,
    }));
  }
  if (payload.specifications !== undefined) {
    body['specifications'] = payload.specifications.map((item) => ({
      label: item.label.trim(),
      value: item.value.trim(),
    }));
  }
  return body;
}

const DEFAULT_PREPARATION_MINUTES = 10;

function normalizePreparationMinutes(value: number | undefined | null): number {
  const minutes = Number(value);
  return Number.isFinite(minutes) && minutes >= 1 ? minutes : DEFAULT_PREPARATION_MINUTES;
}

interface ProductApiRecord {
  id?: string | null;
  vendorId?: string | null;
  shopCategoryId?: string | null;
  sectionId?: string | null;
  shopCategoryIds?: Array<string | null> | null;
  categoryIds?: Array<string | null> | null;
  name?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  images?: Array<string | null> | null;
  isAvailable?: boolean | null;
  isNew?: boolean | null;
  preparationMinutes?: number | null;
  pricePiastres?: number | string | null;
  oldPricePiastres?: number | string | null;
  sectionName?: string | null;
  variants?: unknown;
  combinations?: unknown;
  specifications?: unknown;
  sortOrder?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function productFromPayload(payload: ProductUpdatePayload, id = ''): VendorCatalogProduct {
  const pricePiastres = Number(payload.pricePiastres);
  const piastres = Number.isFinite(pricePiastres) ? pricePiastres : 0;
  const images = payload.images?.map((image) => image.trim()).filter(Boolean) ?? [];
  const categoryIds = payload.categoryIds?.map((sectionId) => sectionId.trim()).filter(Boolean) ?? [];
  return {
    id,
    sectionId: categoryIds[0] ?? '',
    shopCategoryId: categoryIds[0] ?? null,
    categoryIds,
    name: payload.name?.trim() ?? '',
    description: payload.description?.trim() ?? '',
    imageUrl: images[0] ? displayImage(images[0]) : '',
    images,
    isAvailable: payload.isAvailable !== false,
    isNew: payload.isNew === true,
    preparationMinutes: normalizePreparationMinutes(payload.preparationMinutes),
    pricePiastres: piastres,
    oldPricePiastres: payload.oldPricePiastres ?? null,
    sectionName: '',
    variants: payload.variants ?? [],
    combinations: payload.combinations ?? [],
    specifications: payload.specifications ?? [],
    updatedAt: new Date().toISOString(),
  };
}

function unwrapProducts(body: unknown): VendorCatalogProduct[] {
  if (Array.isArray(body)) {
    return body.map((item) => parseProduct(item)).filter((item): item is VendorCatalogProduct => item !== null);
  }
  if (!body || typeof body !== 'object') {
    return [];
  }
  const record = body as Record<string, unknown>;
  for (const key of ['items', 'data', 'products']) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .map((item) => parseProduct(item))
        .filter((item): item is VendorCatalogProduct => item !== null);
    }
  }
  return [];
}

function readCursor(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  const cursor = (body as Record<string, unknown>)['nextCursor'];
  if (typeof cursor !== 'string') {
    return null;
  }
  const trimmed = cursor.trim();
  return trimmed || null;
}

function parseProduct(body: unknown): VendorCatalogProduct | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  const record = body as Record<string, unknown>;
  const direct = toProduct(record as ProductApiRecord);
  if (direct) {
    return direct;
  }
  for (const key of ['product', 'data', 'item']) {
    const nested = record[key];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const product = toProduct(nested as ProductApiRecord);
      if (product) {
        return product;
      }
    }
  }
  return null;
}

function readImages(row: ProductApiRecord): string[] {
  const fromList = (row.images ?? [])
    .filter((item): item is string => typeof item === 'string' && !!item.trim())
    .map((item) => item.trim());
  if (fromList.length) {
    return fromList;
  }
  const single = String(row.imageUrl ?? '').trim();
  return single ? [single] : [];
}

function readOptionalPiastres(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function readCombinations(value: unknown): ProductCombination[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const combinations: ProductCombination[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as Record<string, unknown>;
    const rawMapping = row['sku_mapping'] ?? row['skuMapping'];
    if (!rawMapping || typeof rawMapping !== 'object' || Array.isArray(rawMapping)) {
      continue;
    }
    const skuMapping: Record<string, string> = {};
    for (const [key, mapped] of Object.entries(rawMapping as Record<string, unknown>)) {
      const variantKey = String(key).trim();
      const optionValue = String(mapped ?? '').trim();
      if (variantKey && optionValue) {
        skuMapping[variantKey] = optionValue;
      }
    }
    if (!Object.keys(skuMapping).length) {
      continue;
    }
    const priceRaw = row['price'] ?? row['pricePiastres'] ?? row['price_piastres'];
    const pricePiastres = Number(priceRaw);
    const availableRaw = row['is_available'] ?? row['isAvailable'];
    const stockRaw = row['stockQuantity'] ?? row['stock_quantity'];
    const stockQuantity = Number(stockRaw);
    combinations.push({
      skuMapping,
      pricePiastres: Number.isFinite(pricePiastres) ? pricePiastres : 0,
      isAvailable: availableRaw !== false,
      stockQuantity: Number.isFinite(stockQuantity) ? stockQuantity : null,
    });
  }
  return combinations;
}

function readVariants(value: unknown): ProductVariant[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const variants: ProductVariant[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as Record<string, unknown>;
    const name = String(row['name'] ?? '').trim();
    const options: ProductOption[] = [];
    if (Array.isArray(row['options'])) {
      for (const option of row['options']) {
        if (!option || typeof option !== 'object') {
          continue;
        }
        const record = option as Record<string, unknown>;
        const label = String(record['label'] ?? '').trim();
        if (!label) {
          continue;
        }
        const delta = Number(record['priceDeltaPiastres']);
        const id = String(record['id'] ?? '').trim();
        options.push({
          ...(id ? { id } : {}),
          label,
          priceDeltaPiastres: Number.isFinite(delta) ? delta : 0,
        });
      }
    }
    if (!name || !options.length) {
      continue;
    }
    const id = String(row['id'] ?? '').trim();
    variants.push({ ...(id ? { id } : {}), name, options });
  }
  return variants;
}

function readCategoryIds(row: ProductApiRecord): string[] {
  const fromList = readIdList(row.categoryIds ?? row.shopCategoryIds);
  if (fromList.length) {
    return fromList;
  }
  const single = String(row.shopCategoryId ?? row.sectionId ?? '').trim();
  return single ? [single] : [];
}

function readIdList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);
}

function readSpecifications(value: unknown): ProductSpecification[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const specs: ProductSpecification[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as Record<string, unknown>;
    const label = String(row['label'] ?? '').trim();
    const specValue = String(row['value'] ?? '').trim();
    if (label && specValue) {
      specs.push({ label, value: specValue });
    }
  }
  return specs;
}

function toProduct(row: ProductApiRecord): VendorCatalogProduct | null {
  const id = String(row.id ?? '').trim();
  const name = String(row.name ?? '').trim();
  if (!id || !name) {
    return null;
  }
  const categoryIds = readCategoryIds(row);
  const legacySectionId = String(row.shopCategoryId ?? row.sectionId ?? '').trim();
  const pricePiastres = Number(row.pricePiastres);
  const piastres = Number.isFinite(pricePiastres) ? pricePiastres : 0;
  const images = readImages(row);
  return {
    id,
    vendorId: String(row.vendorId ?? '').trim() || undefined,
    sectionId: categoryIds[0] ?? legacySectionId,
    shopCategoryId: categoryIds[0] ?? (legacySectionId || null),
    categoryIds,
    name,
    description: String(row.description ?? '').trim(),
    imageUrl: images[0] ? displayImage(images[0]) : '',
    images,
    isAvailable: row.isAvailable === true,
    isNew: row.isNew === true,
    preparationMinutes: normalizePreparationMinutes(row.preparationMinutes),
    pricePiastres: piastres,
    oldPricePiastres: readOptionalPiastres(row.oldPricePiastres),
    sectionName: String(row.sectionName ?? '').trim(),
    variants: readVariants(row.variants),
    combinations: readCombinations(row.combinations),
    specifications: readSpecifications(row.specifications),
    sortOrder: row.sortOrder ?? undefined,
    createdAt: row.createdAt ?? undefined,
    updatedAt: row.updatedAt ?? row.createdAt ?? new Date().toISOString(),
  };
}
