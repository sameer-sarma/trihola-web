const API_BASE = import.meta.env.VITE_API_BASE as string;
import type { PickerItem } from "../types/offerTemplateTypes";

// Adjust to your real endpoints & shapes
export async function searchProducts(token: string, q: string): Promise<PickerItem[]> {
  const url = new URL(`${API_BASE}/products/search`);
  if (q) url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json(); // expecting [{id,name,thumbnailUrl,sku}] or similar
  return (data.items ?? data).map((p: any) => ({
    id: p.id, title: p.name, subtitle: p.sku ?? p.slug, imageUrl: p.thumbnailUrl ?? null
  }));
}

export async function searchBundles(token: string, q: string): Promise<PickerItem[]> {
  const url = new URL(`${API_BASE}/bundles/search`);
  if (q) url.searchParams.set("q", q);
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json(); // [{id,title,thumb,code}] etc
  return (data.items ?? data).map((b: any) => ({
    id: b.id, title: b.title ?? b.name, subtitle: b.code ?? b.slug, imageUrl: b.thumbnailUrl ?? null
  }));
}
