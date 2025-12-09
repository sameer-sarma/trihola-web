import { useEffect, useMemo, useState } from "react";
import {
  fetchAccrualPolicy,
  saveAccrualPolicy,
  fetchUsagePolicy,
  saveUsagePolicy,
} from "../services/walletPolicyService";
import {
  PointsAccrualPolicyDTO,
  WalletUsagePolicyDTO,
} from "../types/wallet";
import { defaultAccrual, defaultUsage } from "../utils/walletDefaults";

type Props = {
  businessId: string;  // owner’s userId
  token: string;
};

export default function WalletPolicyEditor({ businessId, token }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [accrual, setAccrual] = useState<PointsAccrualPolicyDTO | null>(null);
  const [usage, setUsage] = useState<WalletUsagePolicyDTO | null>(null);

  // tabs: "accrual" | "usage"
  const [tab, setTab] = useState<"accrual" | "usage">("accrual");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [a, u] = await Promise.all([
          fetchAccrualPolicy(token),
          fetchUsagePolicy(token),
        ]);
        if (!mounted) return;
        setAccrual(a ?? defaultAccrual(businessId));
        setUsage(u ?? defaultUsage(businessId));
        setErr(null);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e.message ?? "Failed to load wallet policies");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [businessId, token]);

  const canSave = useMemo(() => !!accrual && !!usage, [accrual, usage]);

  async function onSave() {
    if (!accrual || !usage) return;
    try {
      setSaving(true);
      const accrualBody: PointsAccrualPolicyDTO = { ...accrual, businessId };
      const usageBody: WalletUsagePolicyDTO = { ...usage, businessId };

      const [savedA, savedU] = await Promise.all([
        saveAccrualPolicy(accrualBody, token),
        saveUsagePolicy(usageBody, token),
      ]);
      setAccrual(savedA);
      setUsage(savedU);
      setErr(null);
      // light toast
      alert("Wallet policies saved.");
    } catch (e: any) {
      setErr(e.message ?? "Failed to save policies");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-wrap"><div className="th-card">Loading wallet policies…</div></div>;
  if (err)      return <div className="page-wrap"><div className="th-card alert alert--error">Error: {err}</div></div>;
  if (!accrual || !usage) return null;

  return (
    <div className="page-wrap">
      <div className="form-card">
        <div className="th-header">
          <h2 className="page-title">Wallet Policies</h2>
        </div>

        {/* Tabs */}
        <div className="th-tabs" role="tablist" aria-label="Wallet policy tabs">
          <button
            role="tab"
            aria-selected={tab === "accrual"}
            className={`th-tab ${tab === "accrual" ? "is-active" : ""}`}
            onClick={() => setTab("accrual")}
          >
            Accrual Policy
          </button>
          <button
            role="tab"
            aria-selected={tab === "usage"}
            className={`th-tab ${tab === "usage" ? "is-active" : ""}`}
            onClick={() => setTab("usage")}
          >
            Usage Policy
          </button>
        </div>

        {/* Panels */}
        {tab === "accrual" && (
          <section className="section-block section-block--accent" role="tabpanel">
            <div className="section-header">Accrual Policy</div>
            <div className="section-grid">
              <NumberField
                label="Points per campaign referral"
                value={accrual.pointsPerCampaignReferral}
                onChange={(v)=> setAccrual({ ...accrual, pointsPerCampaignReferral: v })}
              />
              <NumberField
                label="Points on referral acceptance"
                value={accrual.pointsPerCampaignReferralAcceptance}
                onChange={(v)=> setAccrual({ ...accrual, pointsPerCampaignReferralAcceptance: v })}
              />
              <NumberField
                label="% of prospect purchase"
                step="0.01"
                value={accrual.percentOfCampaignReferralProspectPurchase}
                onChange={(v)=> setAccrual({ ...accrual, percentOfCampaignReferralProspectPurchase: v })}
              />

              {/* NEW: Nullable fields with checkbox */}
              <NullableNumberField
                label="Min prospect purchase (₹)"
                value={accrual.minProspectPurchaseValue}
                onChange={(v)=> setAccrual({ ...accrual, minProspectPurchaseValue: v })}
                step="0.01"
                nullLabel="No minimum"
              />
              <NullableNumberField
                label="Max points per purchase"
                value={accrual.maxPointsPerProspectPurchase}
                onChange={(v)=> setAccrual({ ...accrual, maxPointsPerProspectPurchase: v })}
                nullLabel="No limit"
              />
              <NullableNumberField
                label="Max points per referrer"
                value={accrual.maxPointsPerReferrer}
                onChange={(v)=> setAccrual({ ...accrual, maxPointsPerReferrer: v })}
                nullLabel="No limit"
              />

              <div className="th-field col-span-2">
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={accrual.isActive}
                    onChange={(e)=> setAccrual({ ...accrual, isActive: e.target.checked })}
                  />
                  Mark accrual policy active
                </label>
                <div className="help">Only one accrual policy exists per business.</div>
              </div>
            </div>
          </section>
        )}

        {tab === "usage" && (
          <section className="section-block" role="tabpanel">
            <div className="section-header">Usage Policy</div>
            <div className="section-grid">
              <Toggle
                label="Allow redemption"
                checked={usage.allowRedemption}
                onChange={(v)=> setUsage({ ...usage, allowRedemption: v })}
              />
              <Toggle
                label="Allow encashment"
                checked={usage.allowEncashment}
                onChange={(v)=> setUsage({ ...usage, allowEncashment: v })}
              />
              <Toggle
                label="Allow transfer"
                checked={usage.allowTransfer}
                onChange={(v)=> setUsage({ ...usage, allowTransfer: v })}
              />
              <NumberField
                label="Encash rate (₹ per point)"
                step="0.01"
                disabled={!usage.allowEncashment}
                value={usage.encashRate}
                onChange={(v)=> setUsage({ ...usage, encashRate: v })}
              />
              <NumberField
                label="Min encash points"
                disabled={!usage.allowEncashment}
                value={usage.minEncashPoints}
                onChange={(v)=> setUsage({ ...usage, minEncashPoints: v })}
              />
              <NumberField
                label="Min redemption points"
                value={usage.minRedemptionPoints}
                onChange={(v)=> setUsage({ ...usage, minRedemptionPoints: v })}
              />
            </div>
          </section>
        )}

        {/* Sticky actions (optional; keep header button too) */}
        <div className="actions" style={{ marginTop: 16 }}>
          <button
            className="btn btn--primary"
            disabled={!canSave || saving}
            onClick={onSave}
            type="button"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- Small form controls that reuse your CSS tokens --- */

function NumberField({
  label,
  value,
  onChange,
  step,
  disabled,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  step?: string;
  disabled?: boolean;
}) {
  return (
    <div className="th-field">
      <label className="th-label">{label}</label>
      <input
        className="th-input"
        type="number"
        step={step ?? "1"}
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => {
          const val = e.target.value.trim();
          onChange(val === "" ? null : Number(val));
        }}
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="th-field">
      <label className="th-label">{label}</label>
      <label className="switch">
        <input type="checkbox" checked={checked} onChange={(e)=> onChange(e.target.checked)} />
        <span className="help">{checked ? "Enabled" : "Disabled"}</span>
      </label>
    </div>
  );
}

/**
 * Number field with a “null toggle” checkbox.
 * When the box is checked, the field is treated as null and input is disabled.
 */
function NullableNumberField({
  label,
  value,
  onChange,
  step,
  nullLabel,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step?: string;
  nullLabel: string;
}) {
  const isNull = value === null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.trim() === "") {
      onChange(null);
    } else {
      onChange(Number(raw));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      // user wants this to be null / “no limit”
      onChange(null);
    } else {
      // bring back a concrete number; default to 0 so they can edit
      onChange(0);
    }
  };

  return (
    <div className="th-field">
      <label className="th-label">{label}</label>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <input
          className="th-input"
          type="number"
          step={step ?? "1"}
          disabled={isNull}
          value={value ?? ""}
          onChange={handleInputChange}
        />
        <label
          className="th-checkbox-label"
          style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}
        >
          <input
            type="checkbox"
            checked={isNull}
            onChange={handleCheckboxChange}
          />
          <span>{nullLabel}</span>
        </label>
      </div>
    </div>
  );
}
