import React, { useCallback, useState } from "react";
import { supabase } from "../supabaseClient";
import { approveClaim } from "../services/offerService";
import ApproveClaimModal from "./ApproveClaimModal";

interface Props {
  claimId: string;
  canApprove: boolean;
  claimPolicy: "ONLINE" | "MANUAL" | "BOTH";
  expiresAt?: string | null;
  disabledReason?: string;
  onApproved?: (claimId: string) => void;
  defaultValue?: string; // optional: prefill redemptionValue (e.g., discount amount)
}

const BusinessApproveClaim: React.FC<Props> = ({
  claimId,
  canApprove,
  claimPolicy,
  expiresAt,
  disabledReason,
  onApproved,
  defaultValue,
}) => {
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const isPolicyOK = claimPolicy === "MANUAL" || claimPolicy === "BOTH";
  const isExpired =
    !!expiresAt &&
    Number.isFinite(Date.parse(expiresAt)) &&
    Date.parse(expiresAt) < Date.now();

  const enabled = canApprove && isPolicyOK && !isExpired && !busy;

  const handleConfirmApprove = useCallback(
    async (redemptionValue: string, note?: string) => {
      setBusy(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("Not authenticated");

        await approveClaim(claimId, token, redemptionValue, note);
        onApproved?.(claimId);
      } catch (e) {
        alert((e as Error).message || "Failed to approve claim");
      } finally {
        setBusy(false);
        setShowModal(false);
      }
    },
    [claimId, onApproved]
  );

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
            : "Approve this claim")
        }
        style={{
          padding: "4px 8px",
          fontSize: "0.8rem",
          backgroundColor: enabled ? "#10b981" : "#d1d5db",
          color: enabled ? "white" : "#374151",
          border: "none",
          borderRadius: "4px",
          cursor: enabled ? "pointer" : "not-allowed",
        }}
      >
        ✅ Approve Claim
      </button>

      <ApproveClaimModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onApprove={handleConfirmApprove}
        defaultValue={defaultValue}
      />
    </>
  );
};

export default BusinessApproveClaim;
