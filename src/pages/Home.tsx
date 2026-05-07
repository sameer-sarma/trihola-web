import { useMemo, useState } from "react";
import "../css/home.css";

type InboxEntityType = "THREAD" | "REFERRAL" | "INVITE" | "OFFER" | "ORDER";

type InboxItem = {
  id: string;
  entity: { type: InboxEntityType; slug?: string };
  title: string;
  preview: string;
  updatedAt?: string;
  unread?: boolean;
  participants?: { displayName: string; avatarUrl?: string | null }[];
  statusPill?: { label: string; tone: "good" | "warn" | "muted" | "bad" };
};

type FilterKey =
  | "ALL"
  | "WAITING_ON_ME"
  | "THREADS"
  | "BUSINESSES"
  | "OFFERS"
  | "ORDERS"
  | "ARCHIVED";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "WAITING_ON_ME", label: "Waiting on me" },
  { key: "THREADS", label: "Threads" },
  { key: "BUSINESSES", label: "Businesses" },
  { key: "OFFERS", label: "Offers" },
  { key: "ORDERS", label: "Orders" },
  { key: "ARCHIVED", label: "Archived" },
];

const MOCK: InboxItem[] = [
  {
    id: "thread-34bd39",
    entity: { type: "REFERRAL", slug: "ref-34bd39" },
    title: "Dr Soma Datta → Sweta Bhattacharjee → Sameer Sarma",
    preview: "Referral requested · Offer can be assigned",
    updatedAt: new Date().toISOString(),
    unread: true,
    statusPill: { label: "Active", tone: "good" },
    participants: [
      { displayName: "Dr Soma Datta" },
      { displayName: "Sweta Bhattacharjee" },
      { displayName: "Sameer Sarma" },
    ],
  },
  {
    id: "thread-zestchest",
    entity: { type: "THREAD", slug: "zestchest-engagement" },
    title: "Zestchest customer engagement",
    preview: "Message sent · Course offer shared · Follow-up pending",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    unread: false,
    statusPill: { label: "Waiting", tone: "warn" },
    participants: [{ displayName: "Zestchest" }, { displayName: "Customer" }],
  },
  {
    id: "off-1a2b3c",
    entity: { type: "OFFER", slug: "off-1a2b3c" },
    title: "Offer assigned: 15% off",
    preview: "Offer is ready to claim in the thread.",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    unread: false,
    statusPill: { label: "Ready", tone: "good" },
    participants: [{ displayName: "Zestchest" }, { displayName: "Prospect" }],
  },
  {
    id: "ord-9f7a2d",
    entity: { type: "ORDER", slug: "ord-9f7a2d" },
    title: "Order update: Natural formulation workshop",
    preview: "Payment reported · Business review required",
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    unread: false,
    statusPill: { label: "Review", tone: "warn" },
    participants: [{ displayName: "Zestchest" }, { displayName: "Learner" }],
  },
];

function fmtTime(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const ini = parts.map((p) => p[0]?.toUpperCase()).join("");
  return ini || "T";
}

export default function Home() {
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(MOCK[0]?.id ?? null);

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    let arr = [...MOCK];

    if (filter === "THREADS") arr = arr.filter((x) => x.entity.type === "THREAD" || x.entity.type === "REFERRAL");
    if (filter === "OFFERS") arr = arr.filter((x) => x.entity.type === "OFFER");
    if (filter === "ORDERS") arr = arr.filter((x) => x.entity.type === "ORDER");
    if (filter === "ARCHIVED") arr = [];
    if (filter === "WAITING_ON_ME") arr = arr.filter((x) => x.statusPill?.tone === "warn");
    if (filter === "BUSINESSES") arr = arr.filter((x) => x.title.toLowerCase().includes("zestchest"));

    if (query) {
      arr = arr.filter(
        (x) =>
          x.title.toLowerCase().includes(query) ||
          x.preview.toLowerCase().includes(query) ||
          (x.participants ?? []).some((p) => p.displayName.toLowerCase().includes(query))
      );
    }

    arr.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    return arr;
  }, [filter, q]);

  const selected = useMemo(
    () => items.find((x) => x.id === selectedId) ?? null,
    [items, selectedId]
  );

  function onStartThread() {
    alert("TODO: navigate to Start Thread / Composer");
  }

  function onOpenSelected() {
    if (!selected) return;
    alert(`TODO: open ${selected.entity.type} ${selected.entity.slug ?? selected.id}`);
  }

  return (
    <div className="home">
      <header className="homeTop">
        <div className="homeTopLeft">
          <div className="brandMark" aria-hidden="true" />
          <div className="brandText">
            <div className="brandName">Trihola</div>
            <div className="brandTag">Engagement Hub</div>
          </div>
        </div>

        <div className="homeTopCenter">
          <div className="search">
            <span className="searchIcon" aria-hidden="true">⌕</span>
            <input
              className="searchInput"
              placeholder="Search threads, people, offers, orders…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="homeTopRight">
          <button className="btnPrimary" onClick={onStartThread}>
            + Start thread
          </button>

          <button className="iconBtn" title="Notifications" aria-label="Notifications">
            🔔
          </button>

          <button className="avatarBtn" title="Profile" aria-label="Profile">
            <span className="avatarCircle">SS</span>
          </button>
        </div>
      </header>

      <div className="homeBody">
        <aside className="rail">
          <div className="railSection">
            <div className="railTitle">Filters</div>
            <nav className="railNav">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  className={["railItem", filter === f.key ? "active" : ""].join(" ")}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="railSection">
            <div className="railTitle">Quick actions</div>
            <div className="railActions">
              <button className="btnGhost" onClick={onStartThread}>Start thread</button>
              <button className="btnGhost" onClick={() => alert("TODO: add contact")}>Add contact</button>
            </div>
          </div>
        </aside>

        <main className="list">
          <div className="listHeader">
            <div className="listHeaderLeft">
              <div className="listTitle">
                {FILTERS.find((f) => f.key === filter)?.label ?? "Engagement Hub"}
              </div>
              <div className="listMeta">{items.length} items</div>
            </div>

            <div className="listHeaderRight">
              <button className="btnSubtle" onClick={() => alert("TODO: sort menu")}>Sort</button>
            </div>
          </div>

          <div className="listItems" role="list">
            {items.length === 0 ? (
              <div className="empty">
                <div className="emptyTitle">Nothing here yet</div>
                <div className="emptyText">
                  When conversations turn into referrals, offers, orders, or actions,
                  they’ll appear here — organized like an inbox, built for engagement.
                </div>
                <button className="btnPrimary" onClick={onStartThread}>
                  Start your first thread
                </button>
              </div>
            ) : (
              items.map((it) => {
                const isSel = it.id === selectedId;
                const pill = it.statusPill;
                const first = it.participants?.[0]?.displayName ?? it.title;

                return (
                  <button
                    key={it.id}
                    className={["row", isSel ? "selected" : "", it.unread ? "unread" : ""].join(" ")}
                    onClick={() => setSelectedId(it.id)}
                    role="listitem"
                  >
                    <div className="rowAvatar" aria-hidden="true">
                      {it.participants?.[0]?.avatarUrl ? (
                        <img src={it.participants[0].avatarUrl!} alt="" />
                      ) : (
                        <span>{initials(first)}</span>
                      )}
                    </div>

                    <div className="rowMain">
                      <div className="rowTop">
                        <div className="rowTitle">{it.title}</div>
                        <div className="rowTime">{fmtTime(it.updatedAt)}</div>
                      </div>

                      <div className="rowBottom">
                        <div className="rowPreview">{it.preview}</div>
                        {pill ? (
                          <span className={["pill", pill.tone].join(" ")}>
                            {pill.label}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </main>

        <section className="detail">
          {!selected ? (
            <div className="detailEmpty">
              <div className="detailEmptyTitle">Select a thread</div>
              <div className="detailEmptyText">
                Pick a conversation, referral, offer, or order to see details and available actions.
              </div>
            </div>
          ) : (
            <div className="detailCard">
              <div className="detailHeader">
                <div className="detailType">{selected.entity.type}</div>
                <div className="detailTitle">{selected.title}</div>
                <div className="detailPreview">{selected.preview}</div>
              </div>

              <div className="detailActions">
                <button className="btnPrimary" onClick={onOpenSelected}>Open</button>
                <button className="btnGhost" onClick={() => alert("TODO: snooze / mute")}>Snooze</button>
                <button className="btnGhost" onClick={() => alert("TODO: archive")}>Archive</button>
              </div>

              <div className="detailHint">
                Available actions change based on your role, relationship, and thread context.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}