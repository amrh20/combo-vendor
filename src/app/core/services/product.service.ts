import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, delay, of, tap, throwError } from 'rxjs';
import { API_BASE_URL, USE_MOCK_API } from '../api-config';
import {
  ProductUpdatePayload,
  ProductWritePayload,
  VendorCatalogProduct,
} from '../models/catalog-product.model';
import { piastresToEgp } from '../models/money.model';

const PRODUCTS_URL = `${API_BASE_URL}/v1/vendor/products`;

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly catalog = signal<VendorCatalogProduct[]>(seedProducts());

  list(): Observable<VendorCatalogProduct[]> {
    if (USE_MOCK_API) {
      return of(this.catalog()).pipe(delay(150));
    }
    return this.http.get<VendorCatalogProduct[]>(PRODUCTS_URL).pipe(tap((items) => this.catalog.set(items)));
  }

  getProduct(id: string): Observable<VendorCatalogProduct> {
    if (USE_MOCK_API) {
      const product = this.catalog().find((item) => item.id === id);
      if (!product) {
        return throwError(() => new Error('Product not found'));
      }
      return of(product).pipe(delay(120));
    }
    return this.http.get<VendorCatalogProduct>(`${PRODUCTS_URL}/${id}`);
  }

  createProduct(payload: ProductWritePayload): Observable<VendorCatalogProduct> {
    if (USE_MOCK_API) {
      const created = mapWritePayload(payload, `p${Date.now()}`);
      this.catalog.update((items) => [created, ...items]);
      return of(created).pipe(delay(120));
    }
    return this.http.post<VendorCatalogProduct>(PRODUCTS_URL, payload);
  }

  updateProduct(id: string, payload: ProductUpdatePayload): Observable<VendorCatalogProduct> {
    if (USE_MOCK_API) {
      this.catalog.update((items) =>
        items.map((item) => (item.id === id ? mergeProduct(item, payload) : item)),
      );
      return of(this.catalog().find((p) => p.id === id)!).pipe(delay(120));
    }
    return this.http.patch<VendorCatalogProduct>(`${PRODUCTS_URL}/${id}`, payload);
  }

  setActive(id: string, isAvailable: boolean): Observable<VendorCatalogProduct> {
    return this.updateProduct(id, { isAvailable });
  }

  setInStock(id: string, inStock: boolean): Observable<VendorCatalogProduct> {
    return this.updateProduct(id, { inStock });
  }
}

export function displayImage(url: string): string {
  const raw = url.trim();
  if (!raw) {
    return '';
  }
  return raw.startsWith('/') ? `${API_BASE_URL}${raw}` : raw;
}

function mergeProduct(
  current: VendorCatalogProduct,
  payload: ProductUpdatePayload,
): VendorCatalogProduct {
  const pricePiastres = payload.pricePiastres ?? current.pricePiastres;
  const images = payload.images ?? current.images;
  return {
    ...current,
    ...payload,
    sectionId: payload.sectionId ?? current.sectionId,
    pricePiastres,
    price: piastresToEgp(pricePiastres),
    imageUrl: images[0] ? displayImage(images[0]) : current.imageUrl,
    updatedAt: new Date().toISOString(),
  };
}

function mapWritePayload(payload: ProductWritePayload, id: string): VendorCatalogProduct {
  const images = payload.images.map((image) => image.trim()).filter(Boolean);
  return {
    id,
    sectionId: payload.sectionId ?? '',
    name: payload.name,
    description: payload.description,
    images,
    imageUrl: images[0] ? displayImage(images[0]) : '',
    isAvailable: payload.isAvailable,
    isNew: payload.isNew,
    inStock: payload.inStock,
    preparationMinutes: payload.preparationMinutes,
    pricePiastres: payload.pricePiastres,
    oldPricePiastres: payload.oldPricePiastres,
    price: piastresToEgp(payload.pricePiastres),
    sectionName: '',
    variants: payload.variants,
    specifications: payload.specifications,
    updatedAt: new Date().toISOString(),
  };
}

function seedProducts(): VendorCatalogProduct[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'p1',
      sectionId: 's1',
      name: 'ساندwich مشكل',
      description: 'خبز طازج مع لحوم مشكلة وخضار',
      price: 45,
      pricePiastres: 4500,
      oldPricePiastres: null,
      preparationMinutes: 12,
      isAvailable: true,
      isNew: false,
      inStock: true,
      sectionName: 'ساندwiches',
      images: [],
      imageUrl: '',
      variants: [],
      specifications: [],
      updatedAt: now,
    },
    {
      id: 'p2',
      sectionId: 's2',
      name: 'كروissant بالشokolata',
      description: 'كروissant فرنسي بالشokolata',
      price: 22,
      pricePiastres: 2200,
      oldPricePiastres: null,
      preparationMinutes: 5,
      isAvailable: true,
      isNew: true,
      inStock: false,
      sectionName: 'مخبوزات',
      images: [],
      imageUrl: '',
      variants: [],
      specifications: [],
      updatedAt: now,
    },
    {
      id: 'p3',
      sectionId: 's3',
      name: 'قهوة تركي',
      description: 'قهوة تركي أصيلة',
      price: 18,
      pricePiastres: 1800,
      oldPricePiastres: null,
      preparationMinutes: 8,
      isAvailable: false,
      isNew: false,
      inStock: true,
      sectionName: 'مشروبات',
      images: [],
      imageUrl: '',
      variants: [],
      specifications: [],
      updatedAt: now,
    },
  ];
}
