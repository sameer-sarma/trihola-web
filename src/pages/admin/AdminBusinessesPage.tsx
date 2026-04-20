import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { supabase } from "../../supabaseClient";

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://127.0.0.1:8080";

type BusinessAdminRowDTO = {
  businessId: string;
  slug: string;
  name: string;
  status: string;
  website?: string | null;

  phone?: string | null;
  phoneVerified: boolean;

  email?: string | null;
  emailVerified: boolean;

  businessLogoUrl?: string | null;
  businessResistrationProofUrl?: string | null;
  ownerKYCProofUrl?: string | null;

  createdByUserId: string;
  createdAt?: string | null;
};

function safeText(v: any) {
  if (v === null || v === undefined || String(v).trim() === "") return "—";
  return String(v);
}

function tick(v?: boolean | null) {
  return v === true ? "✓" : "—";
}

function normalizeStatus(s?: string | null) {
  return (s || "").toUpperCase();
}

function formatDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString([], {
    year: "2-digit",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function badgeClass(status: string) {
  const s = normalizeStatus(status);
  switch (s) {
    case "ACTIVE":
      return "badge badge--ok";
    case "PENDING":
      return "badge badge--warn";
    case "SUSPENDED":
      return "badge badge--bad";
    default:
      return "badge";
  }
}

async function getToken(): Promise<string | null> {
  const session = (await supabase.auth.getSession()).data.session;
  return session?.access_token ?? null;
}

async function adminFetchBusinesses(token: string, status: string): Promise<BusinessAdminRowDTO[]> {
  const res = await axios.get(`${API_BASE}/admin/businesses`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { status },
  });
  return res.data as BusinessAdminRowDTO[];
}

async function adminApproveBusiness(token: string, businessId: string): Promise<void> {
  await axios.post(
    `${API_BASE}/admin/businesses/${businessId}/approve`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function adminSuspendBusiness(token: string, businessId: string, reason?: string): Promise<void> {
  await axios.post(
    `${API_BASE}/admin/businesses/${businessId}/suspend`,
    reason ? { reason } : {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

async function adminDeleteBusiness(token: string, businessId: string): Promise<void> {
  await axios.delete(`${API_BASE}/admin/businesses/${businessId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export default function AdminBusinessesPage() {
  const [status, setStatus] = useState<"PENDING" | "ACTIVE" | "SUSPENDED">("PENDING");
  const [items, setItems] = useState<BusinessAdminRowDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const [q, setQ] = useState(""); // local search

  const title = useMemo(() => {
    if (status === "PENDING") return "Pending approvals";
    if (status === "ACTIVE") return "Active businesses";
    return "Suspended businesses";
  }, [status]);

  const load = async () => {
    setLoading(true);
    setErr(null);
    setForbidden(false);

    const token = await getToken();
    if (!token) {
      setErr("Not authenticated.");
      setLoading(false);
      return;
    }

    try {
      const data = await adminFetchBusinesses(token, status);
      setItems(data);
    } catch (e: any) {
      const code = e?.response?.status;
      if (code === 403) {
        setForbidden(true);
        setItems([]);
      } else {
        setErr(e?.response?.data?.error || e?.message || "Failed to load businesses");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const act = async (fn: (token: string) => Promise<void>) => {
    setErr(null);

    const token = await getToken();
    if (!token) {
      setErr("Not authenticated.");
      return;
    }

    try {
      await fn(token);
      await load();
    } catch (e: any) {
      const code = e?.response?.status;
      if (code === 403) {
        setForbidden(true);
        setErr(null);
      } else {
        setErr(e?.response?.data?.error || e?.message || "Action failed");
      }
    }
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((b) => {
      return (
        (b.name || "").toLowerCase().includes(needle) ||
        (b.slug || "").toLowerCase().includes(needle) ||
        (b.email || "").toLowerCase().includes(needle) ||
        (b.phone || "").toLowerCase().includes(needle) ||
        (b.createdByUserId || "").toLowerCase().includes(needle)
      );
    });
  }, [items, q]);

  const counts = useMemo(() => {
    const pending = items.filter((b) => normalizeStatus(b.status) === "PENDING").length;
    const active = items.filter((b) => normalizeStatus(b.status) === "ACTIVE").length;
    const suspended = items.filter((b) => normalizeStatus(b.status) === "SUSPENDED").length;

    return {
      pending,
      active,
      suspended,
      visible: filtered.length,
      total: items.length,
    };
  }, [items, filtered]);

  if (forbidden) {
    return (
      <div className="adminPanel">
        <div className="adminPanel__title">Access denied</div>
        <div className="adminPanel__sub">
          Your account is not authorized to access Trihola Admin routes (403 Forbidden).
        </div>

        <div className="th-actions" style={{ marginTop: 14 }}>
          <button className="btn btn--ghost" type="button" onClick={load}>
            Retry
          </button>
        </div>

      </div>
    );
  }

  return (
    <div className="adminPanel">
      <div className="adminTop">
        <div>
          <h1 className="adminTop__title">Businesses</h1>
          <div className="adminTop__sub">
            Review onboarding status, verify documents, and take moderation actions.
          </div>
        </div>

        <div className="adminTop__actions">
          <button className="btn btn--ghost" type="button" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="app-statGrid app-statGrid--compact">
        <div className="app-statCard">
          <div className="app-statLabel">Pending approvals</div>
          <div className="app-statValue">{counts.pending}</div>
        </div>

        <div className="app-statCard">
          <div className="app-statLabel">Active businesses</div>
          <div className="app-statValue">{counts.active}</div>
        </div>

        <div className="app-statCard">
          <div className="app-statLabel">Suspended businesses</div>
          <div className="app-statValue">{counts.suspended}</div>
        </div>
      </div>

      <div className="th-section">
        <div className="th-section-header">
          <div>
            <h3 className="th-section-title">Filters</h3>
            <div className="th-section-subtitle">
              {counts.visible} shown{q.trim() ? ` for “${q.trim()}”` : ""} • {counts.total} loaded
            </div>
          </div>
        </div>

        <div className="adminTop__actions">
          <input
            className="th-input adminSearch"
            placeholder="Search name, slug, email, phone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={loading}
          />

          <div className="adminChips">
            {(["PENDING", "ACTIVE", "SUSPENDED"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={`chip ${status === s ? "is-on" : ""}`}
                onClick={() => setStatus(s)}
                disabled={loading}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {err && <div className="adminError">{err}</div>}

      {loading ? (
        <div className="adminLoading">Loading businesses…</div>
      ) : filtered.length === 0 ? (
        <div className="adminEmpty">
          {q.trim()
            ? `No businesses matched “${q.trim()}”.`
            : `No ${status.toLowerCase()} businesses found.`}
        </div>
      ) : (
        <div className="adminTableWrap">
          <table className="adminTable">
            <thead>
              <tr>
                <th>Business</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Proofs</th>
                <th>Created</th>
                <th style={{ width: 280 }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((b) => {
                const st = normalizeStatus(b.status);
                const hasBizProof = !!b.businessResistrationProofUrl;
                const hasKycProof = !!b.ownerKYCProofUrl;

                return (
                  <tr key={b.businessId}>
                    <td>
                      <div className="bizCell">
                        <div className="bizLogo">
                          {b.businessLogoUrl ? (
                            <img src={b.businessLogoUrl} alt="" />
                          ) : (
                            <div className="bizLogo__ph">{(b.name || "B").charAt(0).toUpperCase()}</div>
                          )}
                        </div>

                        <div className="bizMeta">
                          <div className="bizName">{safeText(b.name)}</div>
                          <div className="bizSlug">{safeText(b.slug)}</div>

                          <div className="bizContactStack">
                            {b.website ? (
                              <div className="bizContactLine">
                                <span className="bizContactLabel">Website</span>
                                <span className="mono bizContactValue">{b.website}</span>
                              </div>
                            ) : null}

                            {b.email ? (
                              <div className="bizContactLine">
                                <span className="bizContactLabel">Email</span>
                                <span className="mono bizContactValue">{b.email}</span>
                              </div>
                            ) : null}

                            {b.phone ? (
                              <div className="bizContactLine">
                                <span className="bizContactLabel">Phone</span>
                                <span className="mono bizContactValue">{b.phone}</span>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className={badgeClass(b.status)}>{st || "—"}</span>
                    </td>

                    <td>
                      <div className="verifyLine">
                        <span className="pill">E: {tick(b.emailVerified)}</span>
                        <span className="pill">P: {tick(b.phoneVerified)}</span>
                      </div>
                    </td>

                    <td>
                      <div className="proofLine">
                        {hasBizProof ? (
                          <a
                            className="pill pill--link"
                            href={b.businessResistrationProofUrl!}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Business proof
                          </a>
                        ) : (
                          <span className="pill pill--muted">Business: —</span>
                        )}

                        {hasKycProof ? (
                          <a
                            className="pill pill--link"
                            href={b.ownerKYCProofUrl!}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Owner KYC
                          </a>
                        ) : (
                          <span className="pill pill--muted">KYC: —</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="createdCell">
                        <div className="mono">{formatDateTime(b.createdAt)}</div>
                        <div className="createdBy muted mono" title={b.createdByUserId}>
                          by {b.createdByUserId}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="rowActions">
                        {st === "PENDING" && (
                          <button
                            className="btn btn--primary"
                            type="button"
                            onClick={() => act((token) => adminApproveBusiness(token, b.businessId))}
                          >
                            Approve
                          </button>
                        )}

                        {st === "ACTIVE" && (
                          <button
                            className="btn btn--danger"
                            type="button"
                            onClick={() =>
                              act(async (token) => {
                                const reason = window.prompt("Suspend reason (optional):", "");
                                await adminSuspendBusiness(token, b.businessId, reason || undefined);
                              })
                            }
                          >
                            Suspend
                          </button>
                        )}

                        {st === "SUSPENDED" && (
                          <button
                            className="btn btn--primary"
                            type="button"
                            onClick={() => act((token) => adminApproveBusiness(token, b.businessId))}
                            title="Re-activate by approving again"
                          >
                            Activate
                          </button>
                        )}

                        <a className="btn btn--ghost" href={`/business/${b.slug}`} target="_blank" rel="noreferrer">
                          View
                        </a>

                        <button
                          className="btn btn--ghost"
                          type="button"
                          onClick={() =>
                            act(async (token) => {
                              const ok = window.confirm(
                                `Delete business "${b.name}"?\n\nThis is not reversible.`
                              );
                              if (!ok) return;
                              await adminDeleteBusiness(token, b.businessId);
                            })
                          }
                          title="Delete (danger)"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
