// src/components/Breadcrumbs.tsx
import React from "react";
import { Link } from "react-router-dom";
import '../css/breadcrumbs.css'

export type Crumb = { label: React.ReactNode; to?: string };

export default function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav className={`th-breadcrumbs ${className ?? ""}`} aria-label="Breadcrumb">
      <ol>
        {items.map((it, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className={isLast ? "current" : undefined} aria-current={isLast ? "page" : undefined}>
              {it.to && !isLast ? <Link to={it.to}>{it.label}</Link> : <span>{it.label}</span>}
              {!isLast && <span className="sep">›</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
