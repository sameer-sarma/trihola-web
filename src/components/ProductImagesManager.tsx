// src/components/ProductImagesManager.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { addProductImage, listProductImages } from "../queries/productQueries";

type Slot = 1 | 2 | 3;


// List and delete any other keys for a given slot that don’t match the keepPath
async function cleanupSlotVariants(bucket: string, folder: string, slot: 1 | 2 | 3, keepPath: string) {
  const prefix = `${folder}/pos_${slot}.`;
  const { data: listed, error: listErr } = await supabase.storage.from(bucket).list(folder, {
    search: `pos_${slot}.`, // list under folder; filter client-side below
  });
  if (listErr || !listed) return;

  const toDelete: string[] = [];
  for (const obj of listed) {
    const fullPath = `${folder}/${obj.name}`;
    if (fullPath.startsWith(prefix) && fullPath !== keepPath) {
      toDelete.push(fullPath);
    }
  }
  if (toDelete.length > 0) {
    await supabase.storage.from(bucket).remove(toDelete);
  }
}

interface Props {
  productId: string;
  onChanged?: () => void; // notify parent (e.g., to refetch the product)
}

export default function ProductImagesManager({ productId, onChanged }: Props) {
  const [images, setImages] = useState<Record<Slot, string | null>>({
    1: null,
    2: null,
    3: null,
  });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<Slot | null>(null);

  const BUCKET = import.meta.env.VITE_SUPABASE_PRODUCT_BUCKET ?? "product-images";
  const folder = useMemo(() => `product_${productId}`, [productId]);

  // three hidden inputs (one per slot) so each slot has its own Upload button
  const fileInputs = {
    1: useRef<HTMLInputElement>(null),
    2: useRef<HTMLInputElement>(null),
    3: useRef<HTMLInputElement>(null),
  };

  // Fetch current images (so the three tiles show what exists)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const list = await listProductImages(productId, token);
        const next: Record<Slot, string | null> = { 1: null, 2: null, 3: null };
        for (const it of list ?? []) {
          const pos = Math.max(1, Math.min(3, Number(it.position))) as Slot;
          // add a cache-buster in case of upserted same path
          next[pos] = it.url ? `${it.url}${it.url.includes("?") ? "&" : "?"}t=${Date.now()}` : null;
        }
        if (alive) setImages(next);
      } catch (e) {
        // no-op; you can surface a toast if you like
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [productId]);

  const handleChoose = (slot: Slot) => {
    fileInputs[slot].current?.click();
  };

  const handleUpload: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const slot = (Number(e.currentTarget.dataset.slot) as Slot) || 1;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBusy(slot);

      // 1) auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("You are not signed in");

      // 2) compute target path so we truly overwrite when replacing
      const currentUrl = images[slot] ?? null;
      const currentExt = currentUrl
        ? (currentUrl.split(".").pop() || "").split("?")[0].toLowerCase()
        : null;

      // Prefer existing extension to keep the same storage object key; else use new file’s ext.
      const newFileExt = (file.name.split(".").pop() || "jpg").toLowerCase();
      const chosenExt = currentExt || newFileExt;
      const path = `${folder}/pos_${slot}.${chosenExt}`;

      // 3) upload to Supabase (overwrite that exact object)
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type || undefined, // ensure right content-type
        });
      if (upErr) throw upErr;

      // 4) public URL
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Could not get public URL for uploaded image");

      // 5) clean up any other pos_{slot}.* variants (if extension changed)
      await cleanupSlotVariants(BUCKET, folder, slot, path);

      // 6) register with backend (still an insert right now)
      await addProductImage(productId, { url: publicUrl, position: slot }, token);

      // 7) update local UI (cache-bust so <img> refreshes)
      setImages((prev) => ({
        ...prev,
        [slot]: `${publicUrl}${publicUrl.includes("?") ? "&" : "?"}t=${Date.now()}`
      }));
      onChanged?.();
      e.target.value = "";
    } catch (err: any) {
      alert(err?.message ?? "Failed to upload image");
    } finally {
      setBusy(null);
    }
  };

  const Tile = ({ slot }: { slot: Slot }) => {
    const url = images[slot];
    const isPrimary = slot === 1;
    return (
      <div className="th-img-slot">
        {url ? (
          <img src={url} alt={`Product image ${slot}`} className="th-img" />
        ) : (
          <div className="th-img-empty">Empty slot {slot}</div>
        )}

        <div className="th-img-actions">
          <button
            type="button"
            className="th-btn"
            onClick={() => handleChoose(slot)}
            disabled={busy !== null || loading}
            title={url ? "Replace image" : "Upload image"}
          >
            {busy === slot ? "Uploading…" : url ? "Replace" : "Upload"}
          </button>
          {isPrimary && <span className="th-badge">Primary</span>}
        </div>

        <input
          ref={fileInputs[slot]}
          data-slot={slot}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleUpload}
        />
      </div>
    );
  };

  return (
    <div>
      <h3>Images</h3>
      <div className="th-slots">
        <Tile slot={1} />
        <Tile slot={2} />
        <Tile slot={3} />
      </div>
      <p className="th-note">Max 3 images. Slot 1 is used as the primary image.</p>
    </div>
  );
}
