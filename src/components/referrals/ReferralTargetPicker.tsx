import { useMemo, useState } from "react";
import type { BusinessMini, TargetMini, UserMini } from "../../types/referral";
import { useAppData } from "../../context/AppDataContext";

function safeStr(v: any) {
  return v === null || v === undefined ? "" : String(v);
}

function displayNameFromContact(c: any) {
  const fn = safeStr(c?.firstName).trim();
  const ln = safeStr(c?.lastName).trim();
  const full = `${fn} ${ln}`.trim();
  return full || safeStr(c?.displayName).trim() || safeStr(c?.profileSlug) || safeStr(c?.userId) || "User";
}

function toUserMini(c: any): UserMini {
  return {
    userId: safeStr(c?.userId || c?.id || ""), // if userId missing, this may be ""
    slug: safeStr(c?.profileSlug || c?.slug || c?.userId || c?.id || ""),
    firstName: c?.firstName ?? null,
    lastName: c?.lastName ?? null,
    profileImageUrl: c?.profileImageUrl ?? c?.avatarUrl ?? null,
  };
}

function toBusinessMini(b: any): BusinessMini {
  return {
    businessId: safeStr(b?.businessId ?? b?.id ?? ""),
    slug: safeStr(b?.businessSlug ?? b?.slug ?? ""),
    name: safeStr(b?.businessName ?? b?.name ?? b?.slug ?? "Business"),
    logoUrl: (b?.businessLogoUrl ?? b?.logoUrl ?? null) as any,
  };
}

export default function ReferralTargetPicker(props: {
  value: TargetMini | null;
  onChange: (t: TargetMini | null) => void;
  disabled?: boolean;
  excludeUserIds?: string[];
}) {
  const { userContacts, myBusinesses, contactsLoading, businessLoading } = useAppData();
  const [q, setQ] = useState("");

  const excludeSet = useMemo(
    () => new Set((props.excludeUserIds ?? []).map((x) => String(x))),
    [props.excludeUserIds]
  );

  const businesses: BusinessMini[] = useMemo(() => {
    return (myBusinesses ?? []).map(toBusinessMini).filter((b) => !!b.businessId);
  }, [myBusinesses]);

  // ✅ IMPORTANT CHANGE:
  // We allow contacts EVEN IF userId is missing, because you may want to refer to a non-user contact as business.
  // If you truly want "only TriHola users", change the filter to require c.userId.
  const contacts: any[] = useMemo(() => {
    return (userContacts ?? []).filter((c: any) => {
      const uid = safeStr(c?.userId);
      if (uid && excludeSet.has(uid)) return false;
      return true;
    });
  }, [userContacts, excludeSet]);

  const filteredBusinesses = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return businesses;
    return businesses.filter((b) => b.name.toLowerCase().includes(qq) || b.slug.toLowerCase().includes(qq));
  }, [businesses, q]);

  const filteredContacts = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return contacts;
    return contacts.filter((c: any) => {
      const name = displayNameFromContact(c).toLowerCase();
      const phone = safeStr(c?.phone).toLowerCase();
      const email = safeStr(c?.email).toLowerCase();
      return name.includes(qq) || phone.includes(qq) || email.includes(qq);
    });
  }, [contacts, q]);

  const selectedLabel = useMemo(() => {
    if (!props.value) return "";
    if (props.value.kind === "BUSINESS") return props.value.business?.name ?? "Business";
    return displayNameFromContact(props.value.user);
  }, [props.value]);

  return (
    <div className="rtp2">
      <input
        className="rtp2__search"
        placeholder={
          contactsLoading || businessLoading ? "Loading…" : "Select a business or user…"
        }
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={props.disabled}
      />

      {props.value && (
        <div className="rtp2__selected">
          <div className="rtp2__selectedText">{selectedLabel}</div>
          <button
            type="button"
            className="rtp2__clear"
            onClick={() => props.onChange(null)}
            disabled={props.disabled}
          >
            Clear
          </button>
        </div>
      )}

      {!props.value && (
        <div className="rtp2__list">
          {/* Businesses */}
          <div className="rtp2__sectionTitle">Businesses</div>
          {filteredBusinesses.length === 0 ? (
            <div className="rtp2__empty">
              {businessLoading ? "Loading businesses…" : "No matching businesses"}
            </div>
          ) : (
            filteredBusinesses.map((b) => (
              <button
                key={`b:${b.businessId}`}
                type="button"
                className="rtp2__row"
                onClick={() => props.onChange({ kind: "BUSINESS", business: b })}
                disabled={props.disabled}
              >
                <span className="rtp2__rowMain">{b.name}</span>
                <span className="rtp2__badge">Business</span>
              </button>
            ))
          )}

          {/* Users/Contacts acting as business */}
          <div className="rtp2__sectionTitle">Users</div>
          {filteredContacts.length === 0 ? (
            <div className="rtp2__empty">
              {contactsLoading ? "Loading users…" : "No matching users"}
            </div>
          ) : (
            filteredContacts.map((c: any) => {
              const u = toUserMini(c);
              const name = displayNameFromContact(c);
              const uid = safeStr(c?.userId);

              return (
                <button
                  key={`u:${uid || name}`}
                  type="button"
                  className="rtp2__row"
                  onClick={() => props.onChange({ kind: "USER", user: { ...u, firstName: c?.firstName ?? u.firstName, lastName: c?.lastName ?? u.lastName } })}
                  disabled={props.disabled}
                >
                  <span className="rtp2__rowMain">{name}</span>
                  <span className="rtp2__badge">User</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
