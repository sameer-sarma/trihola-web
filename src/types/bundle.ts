// Request item (used when creating/updating)
export type BundleItemReq = {
  productId: string;
  qty?: number; // default to 1 on server
};

// Response item (what Ktor sends now)
export type BundleItemView = {
  productId: string;
  name: string;
  slug: string;  
  primaryImageUrl?: string | null;
  kind?: string | null;     // e.g. "PHYSICAL" | "SERVICE"
  isActive: boolean;
  qty: number;
};

export type BundleDTO = {
  id: string;
  businessId: string;
  businessSlug?: string | null; 
  slug: string;
  title: string;
  description?: string | null;
  isActive: boolean;
  items: BundleItemView[];     // unified enriched list from backend
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type CreateBundleReq = {
  businessId: string;          // validated against JWT on server
  title: string;
  description?: string | null;
  isActive?: boolean;
  items: BundleItemReq[];      // productId + qty
};

export type UpdateBundleReq = {
  title?: string;
  description?: string | null;
  isActive?: boolean;
  items?: BundleItemReq[];     // replace composition if present
};
