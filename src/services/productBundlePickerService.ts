// src/services/productBundlePickerService.ts
import { listOwnerProducts } from "./productService";
import { listOwnerBundles } from "./bundleService";
import type { PickerItem } from "../types/offerTemplateTypes";
import type { UUID } from "../types/catalog";

function norm(s: unknown) {
  return String(s ?? "").toLowerCase().trim();
}

function includes(hay: unknown, q: string) {
  const h = norm(hay);
  return q.length === 0 ? true : h.includes(q);
}

export function makeBusinessProductPickerLoader(opts: {
  actingBusinessId: UUID;
  active?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { actingBusinessId, active = true, limit = 100, offset = 0 } = opts;

  return async (q: string): Promise<PickerItem[]> => {
    const rows = await listOwnerProducts(actingBusinessId, {
      active,
      limit,
      offset,
    });

    const qq = norm(q);

    const filtered = rows.filter((p: any) =>
      includes(p.name, qq) ||
      includes(p.sku, qq) ||
      includes(p.description, qq)
    );

    return filtered.map((p: any) => ({
      id: p.id,
      title: p.name,
      subtitle: p.sku ?? undefined,
      imageUrl: p.primaryImageUrl ?? undefined,
      payload: {
        slug: p.slug,
        businessSlug: p.businessSlug,
        sku: p.sku ?? null,
      },
    }));
  };
}

export function makeBusinessBundlePickerLoader(opts: {
  actingBusinessId: UUID;
  active?: boolean;
  limit?: number;
  offset?: number;
}) {
  const { actingBusinessId, active = true, limit = 100, offset = 0 } = opts;

  return async (q: string): Promise<PickerItem[]> => {
    const rows = await listOwnerBundles(actingBusinessId, {
      active,
      limit,
      offset,
    });

    const qq = norm(q);

    const filtered = rows.filter((b: any) =>
      includes(b.title, qq) ||
      includes(b.description, qq) ||
      includes(b.slug, qq)
    );

    return filtered.map((b: any) => ({
      id: b.id,
      title: b.title,
      subtitle: b.slug ?? undefined,
      imageUrl: b.primaryImageUrl ?? undefined,
      payload: {
        slug: b.slug,
        businessSlug: b.businessSlug,
      },
    }));
  };
}