// src/components/ResolvedBusinessCard.tsx
import React from "react";

type Props = {
  business: {
    profileImageUrl: string | null;
    firstName: string;
    lastName?: string;
    businessName?: string;
  };
  addToContacts: boolean;
  onToggleAddToContacts: (v: boolean) => void;
  onChange: () => void;
};

const primaryName = (b: Props["business"]) =>
  b.businessName || `${b.firstName} ${b.lastName ?? ""}`.trim();

export const ResolvedBusinessCard: React.FC<Props> = ({
  business,
  addToContacts,
  onToggleAddToContacts,
  onChange,
}) => {
  return (
    <div className="crf-resolved">
      <div className="contact-row contact-row--flat">
        {business.profileImageUrl ? (
          <img src={business.profileImageUrl} alt={primaryName(business)} />
        ) : (
          <div className="contact-row__placeholder">No Image</div>
        )}

        <div className="contact-row__text">
          <div className="contact-row__primary">{primaryName(business)}</div>
          <div className="contact-row__secondary">Prefilled from link</div>
        </div>
      </div>

      <div className="crf-resolved-actions">
        <label className="crf-toggle">
          <input
            type="checkbox"
            checked={addToContacts}
            onChange={(e) => onToggleAddToContacts(e.target.checked)}
          />
          Add this business to my contacts
        </label>

        <button type="button" className="btn btn--ghost" onClick={onChange}>
          Change business
        </button>
      </div>
    </div>
  );
};
