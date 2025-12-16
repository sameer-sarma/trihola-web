// src/components/AppGate.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import type { BootstrapResult } from "../hooks/useBootstrap";

type Props = { boot: BootstrapResult };

const AppGate: React.FC<Props> = ({ boot }) => {
  if (boot.loading) return <div className="loading">Loading…</div>;
  if (boot.error) return <div className="error-banner">{boot.error}</div>;

  return <Navigate to={boot.nextRoute} replace />;
};

export default AppGate;
