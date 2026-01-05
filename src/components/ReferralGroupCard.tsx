import { useMemo, useState } from "react";
import "../css/ReferralGrouping.css";
import type { ReferralGroupDTO, ReferralDTO } from "../types/referral";
import ReferralCard from "./ReferralCard";

type Props = {
  group: ReferralGroupDTO;
  userId: string;
  onAccept?: (id: string) => void;
  onReject?: (id: string) => void;
  onCancel?: (id: string) => void;
  onCopyReferralLink?: (slug: string) => void;
};

function roleLabel(role: ReferralGroupDTO["role"]) {
  if (role === "BUSINESS") return "You’re the business";
  if (role === "PROSPECT") return "You’re the prospect";
  if (role === "REFERRER") return "You’re the referrer";
  return String(role || "").toLowerCase();
}

function safeDateShort(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // mailbox-like: short but readable
  return d.toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

function snip(s?: string | null, max = 88) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function getGroupSubtitle(group: ReferralGroupDTO) {
  const titles = (group.items || [])
    .map((x) => x.campaignTitle)
    .filter((x): x is string => !!x && x.trim().length > 0);

  if (!titles.length) return null;

  const freq = new Map<string, number>();
  titles.forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1));

  let best = titles[0];
  let bestCount = 0;
  for (const [t, c] of freq.entries()) {
    if (c > bestCount) {
      best = t;
      bestCount = c;
    }
  }

  if (bestCount === (group.items || []).length) return `Campaign: ${best}`;
  return `Campaign: ${best} (+${(group.items || []).length - bestCount} more)`;
}

/**
 * "Action needed" heuristic:
 * - If you're the PROSPECT => prospectAcceptanceStatus pending-like
 * - If you're the BUSINESS => businessAcceptanceStatus pending-like
 * - If you're the REFERRER => usually no accept/decline gate (0)
 *
 * We keep this robust to enum changes by checking common strings.
 */
function isPendingish(v: any) {
  const s = String(v || "").toUpperCase();
  return (
    s === "PENDING" ||
    s === "AWAITING" ||
    s === "AWAITING_RESPONSE" ||
    s === "ACTION_NEEDED" ||
    s === "REQUESTED"
  );
}

function actionNeededCount(group: ReferralGroupDTO) {
  const items = group.items || [];
  if (group.role === "PROSPECT") {
    return items.filter((x: any) => isPendingish(x.prospectAcceptanceStatus)).length;
  }
  if (group.role === "BUSINESS") {
    return items.filter((x: any) => isPendingish(x.businessAcceptanceStatus)).length;
  }
  return 0;
}

export default function ReferralGroupCard({
  group,
  userId,
  onAccept,
  onReject,
  onCancel,
  onCopyReferralLink,
}: Props) {
  const [open, setOpen] = useState(false);

  const title = group.groupTitle?.trim() || "Group";
  const subtitle = useMemo(() => getGroupSubtitle(group), [group]);

  // newest first
  const items: ReferralDTO[] = useMemo(() => {
    const copy = [...(group.items || [])];
    copy.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return copy;
  }, [group.items]);

  const latest = items[0];
  const latestSnippet = useMemo(() => {
    // Prefer note as preview; fallback to status text
    const note = latest?.note ? snip(latest.note) : "";
    if (note) return note;
    return latest ? `Latest status: ${String(latest.status || "").toLowerCase()}` : "";
  }, [latest]);

  const needs = actionNeededCount(group);

  return (
    <div className={`th-mailrow ${open ? "is-open" : ""}`}>
      {/* Row header (mailbox row) */}
      <div
        role="button"
        tabIndex={0}
        className="th-mailrow__head"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        aria-expanded={open}
      >
        {/* Left: avatar */}
        <div className="th-mailrow__avatar">
          {group.groupImageUrl ? (
            <img src={group.groupImageUrl} alt={title} className="th-mailrow__avatarImg" />
          ) : (
            <div className="th-mailrow__avatarFallback" aria-hidden="true">
              {title.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        {/* Middle: subject + snippet */}
        <div className="th-mailrow__body">
          <div className="th-mailrow__topline">
            <div className={`th-mailrow__title ${needs ? "is-strong" : ""}`}>{title}</div>

            <div className="th-mailrow__chips">
              <span className="th-chip th-chip--info">{roleLabel(group.role)}</span>

              {needs > 0 && (
                <span className="th-chip th-chip--warn" title="Action needed">
                  {needs} need action
                </span>
              )}

              <span className="th-chip">{group.count} referral{group.count === 1 ? "" : "s"}</span>
            </div>
          </div>

          <div className="th-mailrow__subline">
            {subtitle ? (
              <span className="th-mailrow__campaign">{subtitle}</span>
            ) : (
              <span className="th-mailrow__campaign th-muted">—</span>
            )}
            {latestSnippet ? <span className="th-mailrow__snippet">{latestSnippet}</span> : null}
          </div>
        </div>

        {/* Right: time + chevron */}
        <div className="th-mailrow__meta">
          <div className="th-mailrow__time">{safeDateShort(group.latestCreatedAt)}</div>
          <div className="th-mailrow__chev" aria-hidden="true">
            {open ? "▾" : "▸"}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {open && (
        <div className="th-mailrow__expanded">
          {items.map((r) => (
            <div key={r.id} className="th-mailrow__expandedItem">
              <ReferralCard
                referral={r}
                userId={userId}
                onAccept={onAccept}
                onReject={onReject}
                onCancel={onCancel}
                onCopyReferralLink={onCopyReferralLink ? () => onCopyReferralLink(r.slug) : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
