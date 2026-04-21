import React from "react";
import { useEcomIntegrations } from "../queries/productQueries";
import { EcomIntegrationResponse } from "../types/ecomTypes";

export function formatIntegrationLabel(it: Pick<EcomIntegrationResponse, "platform" | "domain" | "isActive">) {
  const map: Record<string, string> = {
    WOOCOMMERCE: "WooCommerce",
    SHOPIFY: "Shopify",
    GENERIC: "Custom",
    UNKNOWN: "Unknown",
  };
  const platform = map[it.platform] ?? it.platform;
  const domain = it.domain ? ` • ${it.domain}` : "";
  const status = it.isActive ? "" : " (inactive)";
  return `${platform}${domain}${status}`;
}

type Props = {
  /** selected integration id (or empty string/undefined for none) */
  value?: string | null;
  /** called with the selected id ('' when None) */
  onChange: (id: string) => void;
  /** include inactive integrations in the list (default: true) */
  includeInactive?: boolean;
  /** render a "None" option (default: true) */
  allowNone?: boolean;
  /** optional UI bits */
  label?: string;
  helpText?: string;
  disabled?: boolean;
  name?: string;
  className?: string;
};

const EcomIntegrationSelect: React.FC<Props> = ({
  value,
  onChange,
  includeInactive = true,
  allowNone = true,
  label = "E-commerce Integration",
  helpText,
  disabled,
  name,
  className,
}) => {
  const { data, isLoading, error } = useEcomIntegrations();

  // keep selected id visible even if backend doesn’t return it anymore
  const options = React.useMemo(() => {
    let list = data ?? [];
    if (!includeInactive) list = list.filter((i) => i.isActive);
    if (value && !list.some((i) => i.id === value)) {
      list = [
        ...list,
        {
          id: String(value),
          businessId: "",
          platform: "UNKNOWN",
          domain: "(no longer available)",
          publicKey: "",
          hasSecret: false,
          isActive: false,
        } as any,
      ];
    }
    return list;
  }, [data, includeInactive, value]);

  const help =
    isLoading
      ? "Loading integrations…"
      : error
      ? (error as Error).message
      : helpText ?? "Choose the integration this product belongs to (optional).";

  return (
    <div className="form-group">
      <label className="label" htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        className={`select ${className ?? ""}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || isLoading}
      >
        {allowNone && <option value="">None</option>}
        {options.map((it) => (
          <option key={it.id} value={it.id}>
            {formatIntegrationLabel(it)}
          </option>
        ))}
      </select>
      <div className="help">{help}</div>
    </div>
  );
};

export default EcomIntegrationSelect;
