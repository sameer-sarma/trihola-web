// pickerHelpers.ts
import type {
  ProductMini, BundleMini,
  ScopeItemSnapshot, GrantItemSnapshot,
} from "../types/offer";
import type { PickerItem } from "../types/offerTemplateTypes";

export function mapScopeToPickerItems(scope: ScopeItemSnapshot[]) {
  const products: PickerItem[] = [];
  const bundles: PickerItem[]  = [];
  for (const it of scope ?? []) {
    if (it.itemType === "PRODUCT" && it.product?.id) {
      const p: ProductMini = it.product;
      products.push({
        id: p.id,
        title: p.name ?? "Product",
        subtitle: p.slug ?? undefined,
        imageUrl: p.primaryImageUrl ?? undefined,
        payload: { kind: "PRODUCT" },
      });
    }
    if (it.itemType === "BUNDLE" && it.bundle?.id) {
      const b: BundleMini = it.bundle;
      bundles.push({
        id: b.id,
        title: b.title ?? "Bundle",
        subtitle: b.slug ?? undefined,
        imageUrl: b.primaryImageUrl ?? undefined,
        payload: { kind: "BUNDLE" },
      });
    }
  }
  return { products: dedupe(products), bundles: dedupe(bundles) };
}

export function mapGrantsToProductPickerItems(grants: GrantItemSnapshot[]) {
  // Your preview currently accepts selectedGrants as { productId, qty }
  // so we expose only PRODUCT grants here. (If/when bundle grants are supported
  // by the preview API, add a bundle mapper as well.)
  const items: PickerItem[] = [];
  for (const g of grants ?? []) {
    if (g.itemType === "PRODUCT" && g.product?.id) {
      items.push({
        id: g.product.id,
        title: g.product.name ?? "Product",
        subtitle: g.product.slug ?? undefined,
        imageUrl: g.product.primaryImageUrl ?? undefined,
        payload: { defaultQty: g.quantity ?? 1, kind: "PRODUCT" },
      });
    }
  }
  return dedupe(items);
}

export function mapGrantsToBundlePickerItems(grants: GrantItemSnapshot[]): PickerItem[] {
  const items: PickerItem[] = [];
  for (const g of grants ?? []) {
    if (g.itemType === "BUNDLE" && g.bundle?.id) {
      const b = g.bundle;
      items.push({
        id: b.id,
        title: b.title ?? "Bundle",
        subtitle: b.slug ?? undefined,
        imageUrl: b.primaryImageUrl ?? undefined,
        payload: { defaultQty: g.quantity ?? 1, kind: "BUNDLE" },
      });
    }
  }
  return dedupe(items);
}

export function makeLocalFetcher(items: PickerItem[]) {
  const base = dedupe(items);
  return async (q: string) => {
    const s = (q || "").trim().toLowerCase();
    if (!s) return base;
    return base.filter(
      (it) =>
        it.title.toLowerCase().includes(s) ||
        (it.subtitle && it.subtitle.toLowerCase().includes(s))
    );
  };
}

function dedupe<T extends { id: string }>(arr: T[]): T[] {
  const m = new Map<string, T>();
  for (const x of arr) if (x?.id) m.set(x.id, x);
  return [...m.values()];
}
