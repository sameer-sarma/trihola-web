import React, { useCallback, useState } from "react";
import { supabase } from "../supabaseClient";
import { approveClaim, rejectClaim } from "../services/offerService";
import ApproveClaimModal from "./ApproveClaimModal";
import type { RedemptionType, GrantLine } from "../types/offer";
import type { PickerItem } from "../types/offerTemplateTypes";

type ClaimPolicy = "ONLINE" | "MANUAL" | "BOTH";
type ScopeKind = "ANY" | "LIST";

// Picker fetchers built upstream from pickerHelpers (scopeItems + grants)
export type PickerFns = {
  fetchScopeProducts?: (q: string) => Promise<PickerItem[]>;
  fetchScopeBundles?: (q: string) => Promise<PickerItem[]>;
  fetchGrantProducts?: (q: string) => Promise<PickerItem[]>;
  fetchGrantBundles?: (q: string) => Promise<PickerItem[]>; // optional
};

interface Props {
  assignedOfferId: string;
  claimId: string;

  // controls for button enablement
  canApprove: boolean;
  claimPolicy: ClaimPolicy;
  expiresAt?: string | null;
  disabledReason?: string;

  // PREVIEW PROPS
  redemptionType: RedemptionType; // "GRANT" | "PERCENTAGE_DISCOUNT" | "FIXED_DISCOUNT"
  scopeKind: ScopeKind;           // "ANY" bill total | "LIST" cart lines
  approvalPickLimit?: number | null; // only used when redemptionType === "GRANT"
  defaultBillTotal?: number;         // convenience for ANY scope

  // picker fetchers (LIST + GRANT selection)
  pickers?: PickerFns; // NEW

  // callbacks
  onApproved?: (claimId: string) => void;
}

const BusinessApproveClaim: React.FC<Props> = ({
  assignedOfferId,
  claimId,
  canApprove,
  claimPolicy,
  expiresAt,
  disabledReason,
  redemptionType,
  scopeKind,
  approvalPickLimit,
  defaultBillTotal = 0,
  pickers,
  onApproved,
}) => {
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const isPolicyOK = claimPolicy === "MANUAL" || claimPolicy === "BOTH";
  const isExpired =
    !!expiresAt &&
    Number.isFinite(Date.parse(expiresAt)) &&
    Date.parse(expiresAt) < Date.now();

  const enabled = canApprove && isPolicyOK && !isExpired && !busy;

  // Accept union (product or bundle). itemType optional for back-compat.
  const handleConfirmApprove = useCallback(
    async (
      redemptionValue: string,
      note?: string,
      grants?: Array<
        | { itemType?: "PRODUCT"; productId: string; qty: number }
        | { itemType?: "BUNDLE"; bundleId: string; qty: number }
      >
    ) => {
      setBusy(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Not authenticated");

        // Map modal grants → GrantLine[] for the API
        const grantLines: GrantLine[] | undefined = grants?.map((g) => {
          if (g.itemType === "BUNDLE" || ("bundleId" in g && (g as any).bundleId)) {
            const { bundleId, qty } = g as { bundleId: string; qty: number };
            return { itemType: "BUNDLE", bundleId, quantity: qty };
          }
          const { productId, qty } = g as { productId: string; qty: number };
          return { itemType: "PRODUCT", productId, quantity: qty };
        });

        await approveClaim(claimId, token, {
          redemptionValue: redemptionValue ?? "",
          note: note ?? "",
          grants: grantLines,
        });

        onApproved?.(claimId);
      } catch (e: any) {
        alert(e.message ?? "Failed to approve claim");
      } finally {
        setBusy(false);
        setShowModal(false);
      }
    },
    [claimId, onApproved]
  );

  const handleConfirmReject = useCallback(async () => {
    setBusy(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Not authenticated");

      await rejectClaim(claimId, { reason: rejectNote || "" }, token);

      onApproved?.(claimId);
    } catch (e: any) {
      alert(e.message ?? "Failed to reject claim");
    } finally {
      setBusy(false);
      setShowReject(false);
    }
  }, [claimId, rejectNote, onApproved]);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={!enabled}
        title={
          disabledReason ??
          (!isPolicyOK
            ? "Only manual/BOTH claims can be approved in person"
            : isExpired
            ? "This claim has expired"
            : !canApprove
            ? "You’re not permitted to approve this claim"
            : busy
            ? "Approving..."
            : "Preview & approve this claim")
        }
        style={{
          padding: "8px 12px",
          fontSize: "0.9rem",
          backgroundColor: enabled ? "#1d4ed8" : "#d1d5db",
          color: enabled ? "#fff" : "#374151",
          border: "none",
          borderRadius: 8,
          cursor: enabled ? "pointer" : "not-allowed",
        }}
      >
        Preview & approve
      </button>

      <button
        onClick={() => setShowReject(true)}
        disabled={!enabled}
        title={
          disabledReason ??
          (!isPolicyOK
            ? "Only manual/BOTH claims can be rejected in person"
            : isExpired
            ? "This claim has expired"
            : !canApprove
            ? "You’re not permitted to reject this claim"
            : busy
            ? "Rejecting..."
            : "Reject this claim")
        }
        style={{
          padding: "8px 12px",
          fontSize: "0.9rem",
          backgroundColor: enabled ? "#fff" : "#f3f4f6",
          color: enabled ? "#b91c1c" : "#9ca3af",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          cursor: enabled ? "pointer" : "not-allowed",
          marginLeft: 8,
        }}
      >
        Reject…
      </button>
      {showReject && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 520 }}>
            <h3>Reject claim</h3>
            <p className="text-muted" style={{ marginTop: 4 }}>
              Optionally include a note. This will be recorded with the rejection.
            </p>
            <textarea
              className="input"
              rows={3}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason (optional)…"
              style={{ width: "100%", marginTop: 12 }}
            />
            <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button className="btn ghost" onClick={() => setShowReject(false)} disabled={busy}>
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleConfirmReject}
                disabled={busy}
                style={{ backgroundColor: "#b91c1c", borderColor: "#b91c1c", color: "#fff" }}
              >
                {busy ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ApproveClaimModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onApprove={handleConfirmApprove}
        // preview inputs
        assignedOfferId={assignedOfferId}
        claimId={claimId}
        redemptionType={redemptionType}
        scopeKind={scopeKind}
        approvalPickLimit={approvalPickLimit ?? 0}
        defaultBillTotal={defaultBillTotal}
        // pass picker fetchers to the modal
        pickers={pickers}
      />
    </>
  );
};

export default BusinessApproveClaim;
