// src/pages/CampaignCreatePage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCreateCampaign } from "../queries/campaignQueries";
import CampaignForm, { CreateCampaignReq } from "../components/CampaignForm";
import { getMyBusiness } from "../services/profileService";

type Props = {
  token: string;
  businessSlug?: string;
};

export default function CampaignCreatePage({ token, businessSlug: propBusinessSlug }: Props) {
  const nav = useNavigate();
  const create = useCreateCampaign();
  const [profileSlug, setProfileSlug] = useState<string | undefined>(undefined);


  // ✅ Fetch profile slug only if prop not provided
  useEffect(() => {
    if (!propBusinessSlug) {
      (async () => {
        try {
          const res = await getMyBusiness(token);
          setProfileSlug(res.businessSlug ?? undefined);
        } catch (e) {
          console.error("Failed to fetch profile", e);
        }
      })();
    }
  }, [propBusinessSlug, token]);

  // ✅ Prefer prop over fetched slug
  const businessSlug = useMemo(
    () => propBusinessSlug ?? profileSlug ?? "",
    [propBusinessSlug, profileSlug]
  );

  const handleSubmit = async (payload: CreateCampaignReq) => {
    const res = await create.mutateAsync(payload); // { campaignId }
    // Go directly to edit so media can be uploaded with a real campaignId path
    nav(`/campaigns/${res.campaignId}/edit`);
  };

return (
  <div className="th-page">
    <div className="th-header">
      <h1 className="page-title">New Campaign</h1>
      <div className="th-header-actions">
        <Link to="/campaigns" className="btn btn--ghost">
          Back to list
        </Link>
      </div>
    </div>

    <div className="card card--form">
      {businessSlug ? (
        <>
          <CampaignForm
            businessSlug={businessSlug}
            onSubmit={handleSubmit}
            onCancel={() => nav(-1)}
            submitLabel="Create campaign"
          />
          </>
      ) : (
        <div className="card">
          <div className="th-muted">Loading business profile...</div>
        </div>
      )}
    </div>
  </div>
);
}
