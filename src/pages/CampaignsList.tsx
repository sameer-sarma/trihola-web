import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useMyCampaigns,
  useDeleteCampaign,
  useUpdateCampaignStatus,
  useUpdateOpenAffiliateMode,
} from "../queries/campaignQueries";
import type { CampaignOwnerDTO } from "../types/campaign";
import type { CampaignStatus, OpenAffiliateMode } from "../types/campaign";
import "../css/CampaignLayout.css";

export default function CampaignsList() {
  const [statusFilter, setStatusFilter] = useState<
    CampaignOwnerDTO["status"] | "ALL"
  >("ALL");

  const { data, isLoading, error, refetch } = useMyCampaigns(
    {},
    { enabled: true }
  );
  const del = useDeleteCampaign();
  const updateStatus = useUpdateCampaignStatus();
  const updateOpenMode = useUpdateOpenAffiliateMode();

  const list = (data ?? []).filter((c) =>
    statusFilter === "ALL" ? true : c.status === statusFilter
  );

  const onDelete = async (id: string) => {
    try {
      await del.mutateAsync(id);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const handleStatusChange = (id: string, value: string) => {
    updateStatus.mutate({ id, status: value as CampaignStatus });
  };

  const handleOpenModeChange = (id: string, value: string) => {
    updateOpenMode.mutate({ id, mode: value as OpenAffiliateMode });
  };

  const handleCopyOpenLink = (c: CampaignOwnerDTO) => {
    const campaignSlug = (c as any).slug as string | undefined;
    const openInviteSlug = (c as any).openInviteSlug as string | undefined;

    if (!campaignSlug || !openInviteSlug) {
      alert(
        "Open affiliate link is not available for this campaign. Turn on open joins so a link can be generated."
      );
      return;
    }

    const base = window.location.origin;
    const url = `${base}/campaign-open/${campaignSlug}/${openInviteSlug}`;
    navigator.clipboard?.writeText(url);
  };

  return (
    <div className="th-page th-page--campaigns">
      {/* Header */}
      <div className="campaign-page-header">
        <div className="campaign-page-header-left">
          <div className="campaign-breadcrumb">TRIHOLA</div>
          <div className="campaign-page-title">Campaigns</div>
          <div className="campaign-page-subtitle">
            See all campaigns you’ve created and control their lifecycle.
          </div>
        </div>
        <div className="campaign-page-actions">
          <Link to="/campaigns/new" className="btn btn--primary">
            New campaign
          </Link>
        </div>
      </div>

      {/* Toolbar – filters */}
      <div className="campaign-toolbar">
        <div className="campaign-toolbar-group">
          <span className="campaign-toolbar-label">Status filter</span>
          <select
            className="campaign-toolbar-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="ALL">All</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
        <div className="campaign-toolbar-group">
          <span className="campaign-toolbar-label">&nbsp;</span>
          <button className="btn btn--ghost" onClick={() => refetch()}>
            Refresh
          </button>
        </div>
      </div>

      {/* List content */}
      {isLoading && <div className="card">Loading campaigns…</div>}
      {error && (
        <div className="card">
          {(error as Error).message || "Failed to load campaigns"}
        </div>
      )}

      {!isLoading && !error && (
        <>
          {list.length === 0 ? (
            <div className="card">
              No campaigns yet. Click <strong>New campaign</strong> to
              create your first one.
            </div>
          ) : (
            <div className="campaigns-grid">
              {list.map((c) => {
                const openMode = (c as any).openAffiliateMode as
                  | OpenAffiliateMode
                  | undefined;
                const openModeDisabled = c.status !== "ACTIVE";

                const img =
                  (c as any).primaryImageUrl ??
                  (c as any).images?.[0]?.url ??
                  undefined;

                return (
                  <div key={c.id} className="campaign-card">
                    {/* Image */}
                    {img && (
                      <div className="campaign-card-media">
                        <img src={img} alt={c.title} />
                      </div>
                    )}

                    {/* Main body */}
                    <div className="campaign-card-body">
                      <div className="campaign-card-title-row">
                        <div>
                          <div className="campaign-card-title">
                            {c.title}
                          </div>
                          <div className="campaign-card-subline">
                            <span
                              className={`s-badge s-badge--chip ${statusClass(
                                c.status
                              )}`}
                            >
                              {c.status}
                            </span>
                            {c.expiresAt && (
                              <span className="campaign-card-expiry">
                                Ends {formatDate(c.expiresAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="campaign-card-actions">
                          <Link
                            to={`/campaigns/${c.id}`}
                            className="btn-link"
                          >
                            View
                          </Link>
                          <Link
                            to={`/campaigns/${c.id}/edit`}
                            className="btn-link btn-link--accent"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="btn-link btn-link--danger"
                            onClick={() => onDelete(c.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Inline controls inside same card */}
                    <div className="campaign-card-footer">
                      <div className="campaign-card-footer-group">
                        <label>Status</label>
                        <select
                          value={c.status as CampaignStatus}
                          onChange={(e) =>
                            handleStatusChange(c.id, e.target.value)
                          }
                          disabled={updateStatus.isPending}
                        >
                          <option value="DRAFT">Draft</option>
                          <option value="ACTIVE">Active</option>
                          <option value="PAUSED">Paused</option>
                          <option value="EXPIRED">Expired</option>
                        </select>
                      </div>

                      <div className="campaign-card-footer-group">
                        <label>Open joins</label>
                        <select
                          value={openMode ?? "OFF"}
                          onChange={(e) =>
                            handleOpenModeChange(c.id, e.target.value)
                          }
                          disabled={updateOpenMode.isPending || openModeDisabled}
                          title={
                            openModeDisabled
                              ? "Open affiliate mode can only be changed for ACTIVE campaigns"
                              : ""
                          }
                        >
                          <option value="OFF">Disabled</option>
                          <option value="AUTO_ACCEPT">Auto-accept</option>
                          <option value="REQUIRE_APPROVAL">
                            Require approval
                          </option>
                        </select>
                      </div>
                     <div className="campaign-card-footer-group">
                        <label>&nbsp;</label>
                        <button
                          type="button"
                          className="btn-link"
                          onClick={() => handleCopyOpenLink(c)}
                        >
                          Copy open link
                        </button>
                      </div>                      
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* helpers */

function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

function statusClass(s: string) {
  switch (s) {
    case "ACTIVE":
      return "status-active";
    case "EXPIRED":
      return "status-expired";
    case "PAUSED":
      return "status-inactive";
    default:
      return "";
  }
}
