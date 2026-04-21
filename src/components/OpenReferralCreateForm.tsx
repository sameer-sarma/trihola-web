// src/components/OpenReferralCreateForm.tsx
import React, { useState, FormEvent, useMemo } from "react";
import { CreateOpenReferralRequest, OpenReferralDTO } from "../types/openReferrals";
import { createOpenReferral } from "../services/openReferralService";


type Mode = "CAMPAIGN" | "STANDALONE";

export interface OpenReferralCreateFormProps {
  mode: Mode;
  businessId: string;
  campaignId?: string | null;
  campaignTitle?: string;
  token: string; 
  defaultProductId?: string | null;
  defaultProductName?: string | null;
  defaultBundleId?: string | null;
  defaultBundleTitle?: string | null;

  onCreated?: (openReferral: OpenReferralDTO) => void;
  onCancel?: () => void;
}

export const OpenReferralCreateForm: React.FC<OpenReferralCreateFormProps> = ({
  mode,
  businessId,
  campaignId,
  campaignTitle,
  token,
  defaultProductId,
  //defaultProductName,
  defaultBundleId,
  //defaultBundleTitle,
  onCreated,
  onCancel,
}) => {
  const [title, setTitle] = useState(
    mode === "CAMPAIGN"
      ? campaignTitle
        ? `Invite your friends to ${campaignTitle}`
        : "Invite your friends"
      : "Refer your friends"
  );
  
  const [message, setMessage] = useState<string>(
    mode === "CAMPAIGN"
      ? "Share this link with a friend. When they accept, they’ll see this campaign and you’ll earn the rewards configured for it."
      : "Share this link with a friend who might be interested in this business."
  );

  const [maxUses, setMaxUses] = useState<number | "" | null>(5);
  const [expiresAt, setExpiresAt] = useState<string>(""); // yyyy-MM-dd from <input type="date">
  const [productId, setProductId] = useState<string | null>(defaultProductId ?? null);
  const [bundleId, setBundleId] = useState<string | null>(defaultBundleId ?? null);
  const [publishNow, setPublishNow] = useState(
    // you can choose defaults:
    mode === "CAMPAIGN" ? true : false
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<OpenReferralDTO | null>(null);

  const publicLink = useMemo(() => {
    if (!created) return "";
    // Adjust to your web public route convention
    return `${window.location.origin}/open/${created.slug}`;
    // or: `${window.location.origin}/public/open-referrals/${created.slug}`
  }, [created]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload: CreateOpenReferralRequest = {
        businessId,
        campaignId: mode === "CAMPAIGN" ? campaignId ?? undefined : undefined,
        // campaignInviteId is not used here (this is a generic open link)
        title: title?.trim() || undefined,
        message: message?.trim() || undefined,
        maxUses:
          maxUses === "" || maxUses === null
            ? undefined
            : typeof maxUses === "string"
            ? Number(maxUses) || undefined
            : maxUses,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        productId: productId || undefined,
        bundleId: bundleId || undefined,
        publishNow,
      };

      const result = await createOpenReferral(payload, token);
      setCreated(result);
      if (onCreated) {
        onCreated(result);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create open referral");
    } finally {
      setSubmitting(false);
    }
  };

    // For now, simple layout using your normal CSS classes (no Tailwind)
  return (
    <div className="card open-referral-create-card">
      <div className="card-header">
        <h2 className="card-title">
          {mode === "CAMPAIGN"
            ? "Create shareable campaign link"
            : "Create open referral link"}
        </h2>

        {onCancel && (
          <button
            type="button"
            className="btn btn--ghost tiny"
            onClick={onCancel}
            disabled={submitting}
          >
            Close
          </button>
        )}
      </div>

      {!created && (
        <form className="form form--two-col" onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group span-2">
            <label className="label">Title (optional)</label>
            <input
              type="text"
              className="input"
              value={title ?? ""}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give this link a friendly title your friends will see"
            />
            <p className="help">
              Shown on the public page and in previews when you share the link.
            </p>
          </div>

          {/* Message */}
          <div className="form-group span-2">
            <label className="label">Message (optional)</label>
            <textarea
              className="textarea"
              value={message ?? ""}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Explain why you’re sharing this and what your friends get."
            />
            <p className="help">
              This appears on the public referral page under the title.
            </p>
          </div>

          {/* Standalone: product / bundle attach */}
          {mode === "STANDALONE" && (
            <div className="form-group span-2">
              <label className="label">
                Attach a product or bundle (optional)
              </label>
              <div className="form-grid">
                <div className="form-group">
                  <span className="label">Product</span>
                  <input
                    type="text"
                    className="input"
                    value={productId ?? ""}
                    placeholder="Product (later: picker)"
                    onChange={(e) => setProductId(e.target.value || null)}
                  />
                </div>
                <div className="form-group">
                  <span className="label">Bundle</span>
                  <input
                    type="text"
                    className="input"
                    value={bundleId ?? ""}
                    placeholder="Bundle (later: picker)"
                    onChange={(e) => setBundleId(e.target.value || null)}
                  />
                </div>
              </div>
              <p className="help">
                Optional: link this open referral to a specific product or bundle.
              </p>
            </div>
          )}

          {/* Campaign label */}
          {mode === "CAMPAIGN" && (
            <div className="form-group span-2">
              <label className="label">Campaign</label>
              <div className="kv">
                {campaignTitle || "Linked campaign"}
              </div>
              <p className="help">
                Friends who use this link will be referred into this campaign.
              </p>
            </div>
          )}

          {/* Max uses + expiry */}
          <div className="form-grid span-2">
            <div className="form-group">
              <label className="label">Maximum uses (optional)</label>
              <input
                type="number"
                min={1}
                className="input"
                value={maxUses === "" || maxUses === null ? "" : maxUses}
                onChange={(e) => {
                  const v = e.target.value;
                  setMaxUses(v === "" ? "" : Number(v));
                }}
                placeholder="e.g. 5 (leave blank for no limit)"
              />
              <p className="help">
                Limit how many friends can successfully claim using this link.
              </p>
            </div>

            <div className="form-group">
              <label className="label">Expires on (optional)</label>
              <input
                type="date"
                className="input"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="help">
                After this date, new friends won’t be able to use this link.
              </p>
            </div>
          </div>

          {/* Publish now */}
          <div className="form-group span-2">
            <label className="switch">
              <input
                type="checkbox"
                checked={publishNow}
                onChange={(e) => setPublishNow(e.target.checked)}
              />
              <span>
                Activate this link immediately
              </span>
            </label>
            <p className="help">
              {publishNow
                ? "Friends can start using this link as soon as you create it."
                : "The link will be saved as a draft; you can activate it later from the campaign or referral tools."}
            </p>
          </div>

          {/* Error + actions */}
          {error && (
            <p className="crf-msg err span-2">{error}</p>
          )}

          <div className="actions span-2">
            {onCancel && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting}
            >
              {submitting ? "Creating link..." : "Create link"}
            </button>
          </div>
        </form>
      )}

      {created && (
        <div className="form">
          <div className="form-group">
            <p className="crf-msg ok">
              Open referral link created! You can share it with your friends now.
            </p>
          </div>

          <div className="form-group">
            <label className="label">Share this link</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                className="input"
                readOnly
                value={publicLink}
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() =>
                  navigator.clipboard
                    .writeText(publicLink)
                    .catch((err) => console.error("Failed to copy", err))
                }
              >
                Copy
              </button>
            </div>
            <p className="help">
              Paste this into WhatsApp, email or any social platform.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
