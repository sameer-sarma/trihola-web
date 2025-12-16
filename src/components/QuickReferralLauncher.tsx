import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./QuickReferralLauncher.css";

type Props = {
  businessUserId: string;          // who to refer TO (Trihola business / Zestchest / etc.)
  prospectUserId?: string;         // who we are referring (optional)
  defaultNote?: string;
  label?: string;
  helper?: string;
};

export const QuickReferralLauncher: React.FC<Props> = ({
  businessUserId,
  prospectUserId,
  defaultNote,
  label = "Refer now",
  helper = "Create a referral in one click",
}) => {
  const nav = useNavigate();

  const href = useMemo(() => {
    const p = new URLSearchParams();
    p.set("businessUserId", businessUserId);
    if (prospectUserId) p.set("prospectUserId", prospectUserId);
    if (defaultNote) p.set("note", defaultNote);

    // Optional: keep onlyBusinesses true for cleaner business picking
    p.set("onlyBusinesses", "true");

    return `/referrals/new?${p.toString()}`;
  }, [businessUserId, prospectUserId, defaultNote]);

  return (
    <div className="qrl">
      <div className="qrl-left">
        <div className="qrl-title">{label}</div>
        <div className="qrl-help">{helper}</div>
      </div>
      <button className="btn btn--primary" onClick={() => nav(href)}>
        Create referral →
      </button>
    </div>
  );
};
