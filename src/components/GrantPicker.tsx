import React, { useMemo } from 'react';
import { GrantOption, GrantSelectionInput } from '../types/offer';

//type RowSel = { key: string; qty: number; option: GrantOption };

interface Props {
  options: GrantOption[];           // already filtered by server to allowed set
  pickLimit: number;
  value: GrantSelectionInput[];     // current selection
  onChange: (v: GrantSelectionInput[]) => void;
}

const keyOf = (o: GrantOption) => `${o.itemType}:${o.id}`;

const GrantPicker: React.FC<Props> = ({ options, pickLimit, value, onChange }) => {
  const map = useMemo(() => new Map(value.map(v => [
    v.itemType === 'PRODUCT' ? `PRODUCT:${v.productId}` : `BUNDLE:${v.bundleId}`,
    v
  ])), [value]);

  const total = value.reduce((acc, v) => acc + (v.quantity ?? 1), 0);
  const limitReached = total >= pickLimit;

  const setQty = (opt: GrantOption, qty: number) => {
    const k = keyOf(opt);
    const next = [...value];
    const idx = next.findIndex(v => (v.itemType === 'PRODUCT' ? `PRODUCT:${v.productId}` : `BUNDLE:${v.bundleId}`) === k);
    if (qty <= 0) {
      if (idx >= 0) next.splice(idx, 1);
    } else {
      const payload: GrantSelectionInput = opt.itemType === 'PRODUCT'
        ? { itemType: 'PRODUCT', productId: opt.id, quantity: qty }
        : { itemType: 'BUNDLE',  bundleId:  opt.id, quantity: qty };
      if (idx >= 0) next[idx] = payload; else next.push(payload);
    }
    onChange(next);
  };

  return (
    <div className="th-vlist">
      {options.map(opt => {
        const k = keyOf(opt);
        const curQty = map.get(k)?.quantity ?? 0;
        const canAdd = !limitReached || curQty > 0;
        return (
          <div key={k} className="th-item-row">
            <div className="th-thumb-48">
              {opt.imageUrl ? <img className="img-cover" alt="" src={opt.imageUrl}/> : <div className="th-placeholder" />}
            </div>
            <div className="th-card-title">{opt.itemType === 'PRODUCT' ? 'Product' : 'Bundle'} — {opt.title}</div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setQty(opt, Math.max(0, curQty - 1))} disabled={curQty === 0}>−</button>
              <div style={{ minWidth: 24, textAlign: 'center' }}>{curQty}</div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setQty(opt, curQty + 1)} disabled={!canAdd}>+</button>
            </div>
          </div>
        );
      })}
      <div className="help">
        Picked {total} / {pickLimit} {pickLimit === 1 ? 'item' : 'items'}.
      </div>
    </div>
  );
};

export default GrantPicker;
