// src/modules/products/types.ts
export type ProductKind = "PHYSICAL" | "SERVICE" | "DIGITAL";
export type SalesChannel = "ONLINE" | "OFFLINE" | "BOTH";

export interface ProductImageDTO {
  id: string;
  productId: string;
  position: 1 | 2 | 3;
  url: string;
}

export interface ProductDTO {
  id: string;
  userId: string;
  slug: string;
  businessSlug?: string | null; 
  name: string;
  sku?: string | null;
  kind: ProductKind;
  salesChannel: SalesChannel;
  category?: string | null;
  description?: string | null;
  productUrl?: string | null;
  primaryImageUrl?: string | null;
  ecomIntegrationId?: string | null;
  isActive: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  images: ProductImageDTO[];
}

export interface CreateProductReq {
  name: string;
  sku?: string | null;
  kind?: ProductKind;
  salesChannel?: SalesChannel;
  category?: string | null;
  description?: string | null;
  productUrl?: string | null;
  primaryImageUrl?: string | null;
  ecomIntegrationId?: string | null;
  isActive?: boolean;
}

export interface UpdateProductReq extends Partial<CreateProductReq> {
  slug?: string | null; // allow changing slug only on edit
}

export interface AddImageReq {
  url: string;
  position?: number; // 1..3
}
