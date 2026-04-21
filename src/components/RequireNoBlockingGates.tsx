// src/components/RequireNoBlockingGates.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { BootstrapDTO } from "../hooks/useBootstrap";

export default function RequireNoBlockingGates({
  boot,
  children,
}: {
  boot: { loading: boolean; error: string | null; data: BootstrapDTO | null };
  children: React.ReactNode;
}) {
  const loc = useLocation();

  if (boot.loading) return <div className="loading">Loading…</div>;
  if (boot.error) return <div className="error-banner">{boot.error}</div>;
  if (!boot.data) return <Navigate to="/email-login" replace />;

  if (boot.data.gates?.blocking) {
    const next = encodeURIComponent(loc.pathname + loc.search);
    return <Navigate to={`/action-required?next=${next}`} replace />;
  }

  return <>{children}</>;
}
