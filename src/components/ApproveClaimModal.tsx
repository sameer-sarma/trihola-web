import React, { useState } from "react";
import "../css/ApproveClaimModal.css"; // Optional styling

interface ApproveClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (redemptionValue: string, note?: string) => void;
  defaultValue?: string;
}

const ApproveClaimModal: React.FC<ApproveClaimModalProps> = ({
  isOpen,
  onClose,
  onApprove,
  defaultValue,
}) => {
  const [redemptionValue, setRedemptionValue] = useState(defaultValue || "");
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>Approve Claim</h3>
        <label>
          Redemption Value:
          <input
            type="text"
            value={redemptionValue}
            onChange={(e) => setRedemptionValue(e.target.value)}
          />
        </label>
        <label>
          Optional Note:
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button onClick={() => onApprove(redemptionValue, note)}>✅ Approve</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ApproveClaimModal;
