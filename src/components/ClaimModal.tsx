import React, { useEffect, useState } from 'react';
import { fetchGrantOptions, requestClaim } from '../services/offerService';
import { ClaimRequestDTO, GrantSelectionInput, GrantOption } from '../types/offer';
import GrantPicker from './GrantPicker';
import { supabase } from "../supabaseClient";

interface Props {
  assignedOfferId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (claim: any) => void; // receive claim view from server
  // optional guardrails
  grantMode?: boolean;             // true when this offer expects grants (defaults true)
}

const ClaimModal: React.FC<Props> = ({ assignedOfferId, isOpen, onClose, onCreated, grantMode = true }) => {
  const [loading, setLoading] = useState(false);
  const [opts, setOpts] = useState<GrantOption[]>([]);
  const [pickLimit, setPickLimit] = useState(1);
  const [sel, setSel] = useState<GrantSelectionInput[]>([]);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        setError("");
        setLoading(true);
        const res = await fetchGrantOptions(assignedOfferId);
        if (!cancelled) {
          setOpts(res.options ?? []);
          setPickLimit(res.pickLimit ?? 1);
          setSel([]); // reset
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load grants");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, assignedOfferId]);

  if (!isOpen) return null;
  const totalPicked = sel.reduce((a, v) => a + (v.quantity ?? 1), 0);
  const canGenerate = !loading && (!grantMode || totalPicked > 0) && totalPicked <= pickLimit;

const generate = async () => {
  try {
    setError("");
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error("Not authenticated");

    const body: ClaimRequestDTO = {
      claimSource: "MANUAL",
      selectedGrants: grantMode ? sel : undefined,
    };

    const claim = await requestClaim(token, assignedOfferId, body);
    onCreated(claim);
    onClose();
  } catch (e: any) {
    setError(e?.message || "Could not create claim");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="modal-backdrop">
      <div className="modal card card--form" role="dialog" aria-modal="true">
        <h3 className="card__title">Choose your free items</h3>
        {error && <div className="alert alert--error" style={{ marginBottom: 8 }}>{error}</div>}
        {loading ? (
          <div className="help">Loading…</div>
        ) : (
          <>
            {grantMode && (
              <GrantPicker
                options={opts}
                pickLimit={pickLimit}
                value={sel}
                onChange={setSel}
              />
            )}
            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn btn--primary" onClick={generate} disabled={!canGenerate}>
                Generate QR
              </button>
              <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClaimModal;
