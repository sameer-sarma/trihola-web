// src/services/pickerLoaders.ts
import type { PickerItem } from "../types/offerTemplateTypes";
import { listProducts } from "../api/productapi";
import { listBundles }  from "../api/bundleapi";

const CDN_BASE = ""; // e.g. "https://cdn.yoursite.com" if your API returns relative paths

function normalizeUrl(u?: string | null): string | null {
  if (!u) return null;
  // handle relative paths like "/media/..." → prefix if you have a CDN/base
  if (CDN_BASE && (u.startsWith("/") && !u.startsWith("//"))) return `${CDN_BASE}${u}`;
  return u;
}

function pickImageUrl(obj: any): string | null {
  // prefer primaryImageUrl, then fallbacks
  const candidate =
    obj.primaryImageUrl ??
    obj.primary_image_url ??
    obj.thumbnailUrl ??
    obj.imageUrl ??
    obj.image_url ??
    (Array.isArray(obj.images) ? obj.images[0]?.url : null) ??
    null;
  return normalizeUrl(candidate);
}

// tolerant mappers
function mapProduct(p: any): PickerItem {
  return {
    id: p.id,
    title: p.name ?? p.title ?? p.slug ?? "Untitled product",
    subtitle: p.sku ?? p.code ?? p.slug ?? "",
    imageUrl: pickImageUrl(p),
  };
}

function mapBundle(b: any): PickerItem {
  return {
    id: b.id,
    title: b.title ?? b.name ?? b.slug ?? "Untitled bundle",
    subtitle: b.code ?? b.slug ?? "",
    imageUrl: pickImageUrl(b),
  };
}

// simple caches
let productCache: PickerItem[] | null = null;
let bundleCache: PickerItem[] | null = null;

function toLower(s?: string | null) { return (s ?? "").toLowerCase(); }
function match(q: string, ...fields: Array<string | undefined | null>) {
  const needle = toLower(q);
  if (!needle) return true;
  return fields.some(f => toLower(f).includes(needle));
}

export async function productPickerLoader(q: string): Promise<PickerItem[]> {
  if (!productCache) {
    const rows = await listProducts({ active: true, limit: 200, offset: 0 });
    productCache = rows.map(mapProduct);
  }
  return productCache.filter(it => match(q, it.title, it.subtitle));
}

export async function bundlePickerLoader(q: string): Promise<PickerItem[]> {
  if (!bundleCache) {
    const rows = await listBundles({ active: true, limit: 200, offset: 0 });
    bundleCache = rows.map(mapBundle);
  }
  return bundleCache.filter(it => match(q, it.title, it.subtitle));
}
