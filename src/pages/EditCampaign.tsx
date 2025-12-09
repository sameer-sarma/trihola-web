import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import CampaignForm, { CreateCampaignReq } from "../components/CampaignForm";
import { useCampaignById, useUpdateCampaign, useSetCampaignOffer, useDeleteCampaignOffer } from "../queries/campaignQueries";
import { getMyBusiness } from "../services/profileService";
import {getOfferTemplates} from "../services/offerService";
import OfferTemplatePicker, { OfferTemplateDTO } from "../components/OfferTemplatePicker";
import ImagesUploader from "../components/ImagesUploader";
import { defaultSupabaseUploader } from "../services/defaultSupabaseUploader";
import { createClient } from "@supabase/supabase-js";
import { useReplaceCampaignImages } from "../queries/campaignQueries";
import type { UploadedMedia, Uploader, UploadContext } from "../types/imagesUploader";
import "../css/imagesUploader.css";

interface Props {
  token: string;
}

function resolvePathTemplate(
  template: string,
  tokenMap: Record<string, string>,
  file: File
) {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const ext = file.name.includes(".")
    ? file.name.substring(file.name.lastIndexOf(".") + 1).toLowerCase()
    : (file.type.split("/")[1] || "bin");
  const uuid = (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

  let out = template
    .replace("{yyyy}", yyyy)
    .replace("{mm}", mm)
    .replace("{dd}", dd)
    .replace("{uuid}", uuid)
    .replace("{ext}", ext);

  // replace any custom tokens from tokenMap, e.g. {campaignId}
  for (const [k, v] of Object.entries(tokenMap)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return out;
}

export default function EditCampaign ({ token }: Props) {
  const nav = useNavigate();
  const { id } = useParams<{ id: string }>();
  const q = useCampaignById(id);
  const update = useUpdateCampaign();
  const setOfferMutation = useSetCampaignOffer();
  const deleteOfferMutation = useDeleteCampaignOffer();

  const [profileSlug, setProfileSlug] = useState<string | undefined>(undefined);
  const [templates, setTemplates] = useState<OfferTemplateDTO[] | null>(null);
  const [draftOfferId, setDraftOfferId] = useState<string | null>("");

  const replaceImages = useReplaceCampaignImages();
  const supabase = useMemo(
    () => createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!),
    []
  );

  //  const uploader = useMemo(() => defaultSupabaseUploader(supabase), [supabase]);
  const uploader = useMemo<Uploader>(() => {
    // your existing fn – likely returns (args) => Promise<UploadedMedia>
    const supaUpload = defaultSupabaseUploader(supabase);

    // adapt to (file, ctx) => Promise<UploadedMedia>
    const adapted: Uploader = async (file: File, ctx: UploadContext) => {
      const path = resolvePathTemplate(ctx.pathTemplate, ctx.tokenMap ?? {}, file);
      return supaUpload({
        file,
        path,
        bucket: ctx.bucket,
        makePublic: ctx.makePublic,
        signURLs: ctx.signURLs,
        signTTLSeconds: ctx.signTTLSeconds,
        // options?: UploadOptions (add if your uploader supports it)
      });
    };
    return adapted;
  }, [supabase]);

  // preload existing media if available on q.data
  const [mediaItems, setMediaItems] = useState<UploadedMedia[]>([]);
  const [primaryUrl, setPrimaryUrl] = useState<string | null>(null);

  // fetch business slug (needed by CampaignForm for product/bundle drawers)
  useEffect(() => {
    (async () => {
      try {
        const res = await getMyBusiness(token); // token handled inside authFetch if you do that globally
        setProfileSlug(res.businessSlug ?? undefined);
      } catch (e) {
        console.error("Failed to fetch profile", e);
      }
    })();
  }, []);

useEffect(() => {
  if (!q.data) return;

  const primary = q.data.primaryImageUrl ?? null;

  const mapped: UploadedMedia[] = Array.isArray(q.data.images)
    ? q.data.images
        .slice()
        .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
        .map((m: any) => ({
          id: (crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
          url: m.url,
          storageKey: "",             // unknown from server
          bucket: "campaign-media",
          mimeType: "image/jpeg",     // unknown; safe default
          sizeBytes: 0,
          width: undefined,
          height: undefined,
          durationSec: undefined,
          alt: m.alt ?? "",
          caption: "",
          isCover: primary ? m.url === primary : false,
        }))
    : [];

  setMediaItems(mapped);
  setPrimaryUrl(primary);
}, [q.data,q.data?.images, q.data?.primaryImageUrl]);

  // Lazy-load templates on first focus
  const ensureTemplates = async () => {
    if (templates) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    const list = await getOfferTemplates(token);
    setTemplates(list);
  };

  useEffect(() => {
  ensureTemplates();
}, []);

  const businessSlug = profileSlug ?? "";

  // when campaign loads, sync draft to persisted
    useEffect(() => {
    if (!q.data) return;
    const persistedId = q.data.offer?.offerTemplateId ?? null;
    setDraftOfferId(persistedId);
  }, [q.data]);

  // map owner DTO -> CampaignForm.initial
  const initial: Partial<CreateCampaignReq> | undefined = useMemo(() => {
    if (!q.data) return undefined;
    return {
      title: q.data.title,
      message: q.data.message ?? "",
      campaignDescription: q.data.campaignDescription ?? "",
      affiliateHeadline: q.data.affiliateHeadline ?? "",
      affiliateSubheading: q.data.affiliateSubheading ?? "",
      affiliateLongDescription: q.data.affiliateLongDescription ?? "",
      prospectDescriptionShort: q.data.prospectDescriptionShort ?? "",
      prospectDescriptionLong: q.data.prospectDescriptionLong ?? "",
      themeColor: q.data.themeColor ?? "",
      primaryImageUrl: q.data.primaryImageUrl ?? "",
      singleProductId: q.data.singleProductId ?? "",
      bundleId: q.data.bundleId ?? "",
      startsAtIso: q.data.startsAt ?? undefined,
      expiresAtIso: q.data.expiresAt ?? undefined,
    };
  }, [q.data]);

 const handleSubmit = async (payload: CreateCampaignReq) => {
   if (!id) return;
    // 1) Replace all images with the shape Ktor expects
    const imagesForApi = mediaItems.map((m, idx) => ({
      url: m.url,
      position: idx,
      alt: m.alt ?? null,
    }));
    await replaceImages.mutateAsync({ id, images: imagesForApi });

    // 2) Update campaign metadata (including cover URL)
    await update.mutateAsync({ id, body: { ...payload, primaryImageUrl: primaryUrl ?? undefined } });
   nav(`/campaigns/${id}`);
 };

  if (q.isLoading) {
    return <div className="card">Loading…</div>;
  }
  if (q.error || !q.data) {
    return <div className="alert alert--error">{(q.error as Error)?.message || "Not found"}</div>;
  }
  
  const handleSaveOffer = async () => {
    if (!token) return;
    if (!id) return;

    if (!draftOfferId) {
      // user cleared selection → delete
      await deleteOfferMutation.mutateAsync({ campaignId: id, token });
      return;
    }

    await setOfferMutation.mutateAsync({
      campaignId: id,
      offerTemplateId: draftOfferId,
      token,
    });
  };

return (
  <div className="th-page">
    <div className="th-header">
      <h1 className="page-title">Edit Campaign</h1>
      <div className="th-header-actions">
        <Link to={`/campaigns/${id}`} className="btn btn--ghost">Back to details</Link>
      </div>
    </div>

    <div className="card card--form">
      {businessSlug ? (
        <>
          <CampaignForm
            businessSlug={businessSlug}
            initial={initial}
            onSubmit={handleSubmit}
            onCancel={() => nav(-1)}
            submitLabel="Save changes"
          />
      <div className="form-card" style={{ marginTop: 20 }}>
        <h3 className="page-title">Linked offer</h3>
        <p className="text-muted" style={{ marginBottom: 16 }}>
          Attach an offer template to this campaign. This will be applied to the prospect role.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            alignItems: "start",
          }}
        >
          <OfferTemplatePicker
            templates={templates}
            // 👇 this is what backend has right now
            persistedId={q.data.offer?.offerTemplateId ?? null}
            // 👇 this is what user is currently picking
            value={draftOfferId}
            onChange={(tplId) => setDraftOfferId(tplId)}
            title="Prospect offer"
            allowNone={true}
            showPreview={true}
            maxPreviewChars={120}
          />

          <button
            type="button"
            onClick={handleSaveOffer}
            disabled={setOfferMutation.isPending || deleteOfferMutation.isPending}
            className="th-button th-button-primary"
            style={{ marginTop: 30 }}
          >
            Save
          </button>
        </div>
      </div>

          {/* Campaign media (max 5) */}
          <div className="card" style={{ marginTop: 16 }}>
            <ImagesUploader
              mode="multiple"
              label="Campaign media"
              hint="Up to 5 images/videos. JPEG/PNG/WEBP/MP4."
              bucket="campaign-media"
              pathTemplate={`campaigns/${id}/media/{yyyy}/{mm}/{dd}/{uuid}.{ext}`}
              tokenMap={{ campaignId: id ?? "" }}
              makePublic={true}
              signURLs={false}
              value={mediaItems}
              maxCount={5}
              uploader={uploader}
              onChange={(items, primary) => {
                setMediaItems(items);
                setPrimaryUrl(primary);
              }}
              onError={(e) => console.error("upload error", e)}
            />
          </div>
        </>
      ) : (
        <div className="card">
          <div className="th-muted">Loading business profile…</div>
        </div>
      )}
    </div>
  </div>
);
}
