/** One choice inside a variant (pricing lives on `ProductCombination`). */
export interface ProductOption {
  id?: string;
  label: string;
  priceDeltaPiastres: number;
}

/** Sellable SKU for a specific option permutation. */
export interface ProductCombination {
  skuMapping: Record<string, string>;
  pricePiastres: number;
  isAvailable: boolean;
  stockQuantity: number | null;
}

export interface ProductVariant {
  id?: string;
  name: string;
  options: ProductOption[];
}

export interface ProductSpecification {
  label: string;
  value: string;
}

/**
 * Shop product from `GET /v1/store/products` and `PATCH /v1/store/products/:id/availability`.
 * `isAvailable` is the only stock switch. Display money as `pricePiastres / 100`.
 */
export interface VendorCatalogProduct {
  id: string;
  vendorId?: string;
  /** Section id on the store API. The form still reads `sectionId`. */
  shopCategoryId?: string | null;
  sectionId: string;
  /** Shop sections from `shopCategoryIds` on the API. */
  categoryIds: string[];
  name: string;
  description: string;
  imageUrl: string;
  images: string[];
  /** False: out of stock, hidden from the customer app. */
  isAvailable: boolean;
  isNew: boolean;
  preparationMinutes: number;
  /** Integer piastres. */
  pricePiastres: number;
  oldPricePiastres: number | null;
  sectionName: string;
  variants: ProductVariant[];
  combinations: ProductCombination[];
  specifications: ProductSpecification[];
  sortOrder?: number;
  createdAt?: string;
  updatedAt: string;
}

export interface ProductListPage {
  items: VendorCatalogProduct[];
  nextCursor: string | null;
}

export interface ProductWritePayload {
  /** Store section ids from `GET /v1/store/sections` (sent as `shopCategoryIds`). */
  categoryIds: string[];
  name: string;
  description: string;
  images: string[];
  isAvailable: boolean;
  isNew: boolean;
  preparationMinutes: number;
  pricePiastres: number;
  oldPricePiastres: number | null;
  variants: ProductVariant[];
  combinations: ProductCombination[];
  specifications: ProductSpecification[];
}

export type ProductUpdatePayload = Partial<ProductWritePayload>;
