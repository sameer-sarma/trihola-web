import React, { useEffect, useMemo, useState } from "react";
import type { PickerItem } from "../types/offerTemplateTypes";
import {AvatarOrPlaceholder} from "../utils/uiHelper";

type Props = {
  value?: string | null;
  onChange: (id: string | null, item?: PickerItem) => void;
  fetchItems: (q: string) => Promise<PickerItem[]>; // injected loader
  placeholder?: string;
  disabled?: boolean;
  labelRight?: React.ReactNode;                      // e.g. “My Products”
};

const ProductPicker: React.FC<Props> = ({
  value, onChange, fetchItems, placeholder = "Search product...",
  disabled, labelRight
}) => {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<PickerItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<PickerItem | undefined>(undefined);

  const selectedId = useMemo(() => value ?? null, [value]);

  useEffect(() => {
    let stop = false;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const list = await fetchItems(q);
        if (!stop) setItems(list);
        if (!stop && selectedId && !selected) {
          const pre = list.find(i => i.id === selectedId);
          if (pre) setSelected(pre);
        }
      } finally {
        if (!stop) setBusy(false);
      }
    }, 200);
    return () => { stop = true; clearTimeout(t); };
  }, [q, fetchItems]); // eslint-disable-line

  const choose = (it: PickerItem) => {
    setSelected(it);
    onChange(it.id, it);
    setOpen(false);
  };

  const clear = () => {
    setSelected(undefined);
    onChange(null);
  };

  return (
    <div className="select-popover">
      <div className="select-actions" style={{ justifyContent:"space-between", marginBottom:6 }}>
        <span className="badge">{selected ? "Selected" : "Pick product"}</span>
        {labelRight}
      </div>

      <input
        className="th-input select-input"
        placeholder={selected ? selected.title : placeholder}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        disabled={disabled}
      />

      {selected && (
        <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:8 }}>
          <AvatarOrPlaceholder name={selected.title} src={selected.imageUrl || undefined} size={28}/>
          <div>
            <div className="title">{selected.title}</div>
            {selected.subtitle && <div className="subtitle">{selected.subtitle}</div>}
          </div>
          <button type="button" className="btn btn--ghost" onClick={clear} style={{ marginLeft:"auto" }}>
            Clear
          </button>
        </div>
      )}

      {open && (
        <div className="select-popover-panel" onMouseDown={(e)=>e.preventDefault()}>
          {busy && <div className="select-empty">Searching…</div>}
          {!busy && items.length === 0 && <div className="select-empty">No products</div>}
          {!busy && items.map(it => (
            <div key={it.id} className="select-item" onClick={() => choose(it)}>
              <AvatarOrPlaceholder name={it.title} src={it.imageUrl || undefined} size={36}/>
              <div>
                <div className="title">{it.title}</div>
                {it.subtitle && <div className="subtitle">{it.subtitle}</div>}
              </div>
              {selectedId === it.id && <div className="badge">Selected</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductPicker;
