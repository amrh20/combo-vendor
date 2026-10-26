export interface ProductOption {
  id?: string;
  label: string;
  priceDeltaPiastres: number;
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

export interface VendorCatalogProduct {
  id: string;
  sectionId: string;
  name: string;
  description: string;
  imageUrl: string;
  images: string[];
  isAvailable: boolean;
  isNew: boolean;
  inStock: boolean;
  preparationMinutes: number;
  pricePiastres: number;
  oldPricePiastres: number | null;
  price: number;
  sectionName: string;
  variants: ProductVariant[];
  specifications: ProductSpecification[];
  updatedAt: string;
}

export interface ProductWritePayload {
  sectionId: string | null;
  name: string;
  description: string;
  images: string[];
  isAvailable: boolean;
  isNew: boolean;
  inStock: boolean;
  preparationMinutes: number;
  pricePiastres: number;
  oldPricePiastres: number | null;
  variants: ProductVariant[];
  specifications: ProductSpecification[];
}

export type ProductUpdatePayload = Partial<ProductWritePayload>;
