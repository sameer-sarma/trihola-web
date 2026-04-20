import { useMemo, useState } from "react";
import type { BusinessMini } from "../../types/referral";

function matches(b: BusinessMini, q: string) {
  const n = q.trim().toLowerCase();
  if (!n) return true;
  return (
    (b.name ?? "").toLowerCase().includes(n) ||
    (b.slug ?? "").toLowerCase().includes(n) ||
    (b.businessId ?? "").toLowerCase().includes(n)
  );
}

export default function BusinessSingleSelect(props: {
  businesses: BusinessMini[];
  value: BusinessMini | null;
  onChange: (b: BusinessMini | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return (props.businesses ?? []).filter((b) => matches(b, q));
  }, [props.businesses, q]);

  return (
    <div className="bss">
      <input
        className="th-input bss__search"
        placeholder={props.placeholder || "Search businesses…"}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        disabled={props.disabled}
      />

      <div className="bss__list">
        {filtered.length === 0 ? (
          <div className="muted bss__empty">No businesses match your search.</div>
        ) : (
          filtered.map((b) => {
            const on = props.value?.businessId === b.businessId;
            return (
              <div
                key={b.businessId}
                className={`bss__row ${on ? "is-on" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => props.onChange(on ? null : b)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") props.onChange(on ? null : b);
                }}
              >
                <div className="bss__avatar">
                  {b.logoUrl ? <img src={b.logoUrl} alt={b.name} /> : <div className="bss__ph">B</div>}
                </div>
                <div className="bss__text">
                  <div className="bss__name">{b.name}</div>
                  <div className="bss__sub muted">{b.slug}</div>
                </div>
                <div className="bss__check">
                  <input type="radio" checked={on} readOnly />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
