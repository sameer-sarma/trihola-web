import React from "react";
import OfferTierTable from "./OfferTierTable";
import type { OfferDetailsDTO } from "../types/offer";
import "../css/ui-forms.css";

interface Props {
  offer: OfferDetailsDTO;
  title?: string;
}

const OfferTiersSection: React.FC<Props> = ({ offer, title = "Tiered discount (bands by order amount)" }) => {
  const tiers = (offer as any).tiers as any[] | undefined;
  if (!Array.isArray(tiers) || tiers.length === 0) return null;

  return (
    <div className="card">
      <div className="section-header">{title}</div>
      <OfferTierTable tiers={tiers} />
    </div>
  );
};

export default OfferTiersSection;
