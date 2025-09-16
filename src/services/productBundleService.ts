import { listBusinessProducts } from "../api/productapi";
import { listBusinessBundles } from "../api/bundleapi";

//type PickerItem = { id: string; label: string; subtitle?: string; imageUrl?: string };
//type Loader = (q: string) => Promise<PickerItem[]>;

function norm(s: unknown) {
  return String(s ?? "").toLowerCase().trim();
}

function includes(hay: unknown, q: string) {
  const h = norm(hay);
  return q.length === 0 ? true : h.includes(q);
}

export function makeBusinessProductPickerLoader(opts: {
  businessSlug: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { businessSlug, active = true, limit = 100, offset = 0 } = opts;

  return async (q: string) => {
    // rows: ProductRecord[] coming from Ktor (has `name`, `sku`, `description`, `primaryImageUrl`, etc.)
    const rows = await listBusinessProducts(businessSlug, { active, limit, offset });

    const qq = norm(q);
    const filtered = rows.filter((p: any) =>
      includes(p.name, qq) || includes(p.sku, qq) || includes(p.description, qq)
    );

    // 🔁 Map Ktor `name` → PickerItem `title`
    return filtered.map((p: any) => ({
      id: p.id,
      title: p.name,                    // ← changed from `label: p.name`
      subtitle: p.sku ?? undefined,
      imageUrl: p.primaryImageUrl ?? undefined,
      // (optional) If you ever need business context:
      // businessSlug: p.businessSlug
    }));
  };
}

export function makeBusinessBundlePickerLoader(opts: {
  businessSlug: string;
  active?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { businessSlug, active = true, limit = 100, offset = 0 } = opts;

  return async (q: string) => {
    const rows = await listBusinessBundles(businessSlug, { active, limit, offset });

    const qq = norm(q);
    const filtered = rows.filter((b: any) =>
      includes(b.name, qq) || includes(b.description, qq)
    );

    return filtered.map((b: any) => ({
      id: b.id,
      title: b.name,                    // ← changed from `label: b.name`
      subtitle: b.sku ?? undefined,     // keep if your bundles have SKU; else drop
      imageUrl: b.primaryImageUrl ?? undefined,
    }));
  };
}