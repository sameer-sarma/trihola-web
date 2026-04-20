// src/types/catalog.ts

export type UUID = string;

/**
 * Mirrors backend enums:
 * - com.trihola.enums.ProductKind
 * - com.trihola.enums.SalesChannel
 *
 * If your backend adds new enum values later, add them here too.
 */
export type ProductKind =
  | "SERVICE"
  | "PRODUCT"
  | "DIGITAL"
  | "SUBSCRIPTION";

export type SalesChannel =
  | "ONLINE"
  | "OFFLINE"
  | "BOTH";

/** Product image row */
export type ProductImageDTO = {
  id: UUID;
  productId: UUID;
  position: number;
  url: string;
};

/** Product record returned by backend */
export type ProductRecord = {
  id: UUID;
  businessId: UUID;
  businessSlug?: string | null;
  slug: string;
  name: string;
  sku?: string | null;
  kind: ProductKind;
  salesChannel: SalesChannel;
  category?: string | null;
  description?: string | null;
  productUrl?: string | null;
  primaryImageUrl?: string | null;
  ecomIntegrationId?: UUID | null;
  isActive: boolean;
  createdAt: string; // kotlinx.datetime.Instant serialized
  updatedAt: string; // kotlinx.datetime.Instant serialized
  images: ProductImageDTO[];
};

export type CreateProductRequest = {
  slug?: string | null;
  name: string;
  sku?: string | null;
  kind?: ProductKind;           // default SERVICE (backend)
  salesChannel?: SalesChannel;  // default BOTH (backend)
  category?: string | null;
  description?: string | null;
  productUrl?: string | null;
  primaryImageUrl?: string | null;
  ecomIntegrationId?: UUID | null;
  isActive?: boolean;           // default true (backend)
};

export type UpdateProductRequest = {
  slug?: string | null;
  name?: string | null;
  sku?: string | null;
  kind?: ProductKind | null;
  salesChannel?: SalesChannel | null;
  category?: string | null;
  description?: string | null;
  productUrl?: string | null;
  primaryImageUrl?: string | null;
  ecomIntegrationId?: UUID | null;
  isActive?: boolean | null;
};

export type AddProductImageRequest = {
  url: string;
  position?: number | null;
  makePrimary?: boolean;
};

/* ------------------------------- Bundles ------------------------------- */

/**
 * Backend currently returns `kind: String?` in BundleItemDTO, not ProductKind.
 * We'll keep it loose to match Ktor.
 */
export type BundleItemDTO = {
  productId: UUID;
  name: string;
  slug: string;
  primaryImageUrl?: string | null;
  kind?: string | null;
  isActive: boolean;
  qty: number;
};

export type BundleItemInput = {
  productId: UUID;
  qty?: number; // default 1 (backend)
};

export type BundleRecord = {
  id: UUID;
  businessId: UUID;
  businessSlug?: string | null;
  slug: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  items: BundleItemDTO[];
  createdAt: string; // Instant
  updatedAt: string; // Instant
};

export type CreateBundleRequest = {
  slug?: string | null;
  title: string;
  description?: string | null;
  isActive?: boolean; // default true (backend)
  items?: BundleItemInput[]; // backend default emptyList()
};

export type UpdateBundleRequest = {
  slug?: string | null;
  title?: string | null;
  description?: string | null;
  isActive?: boolean | null;
  items?: BundleItemInput[] | null;
};

/* -------------------------- List / paging helpers -------------------------- */

export type ListParams = {
  active?: boolean;   // maps to ?active= (owner list can be null; we’ll omit if undefined)
  limit?: number;
  offset?: number;
};

export type OwnerProductListParams = ListParams & {
  ecomIntegrationId?: UUID;
};
