// src/pages/threads/components/ThreadIdentityMenu.tsx
import React from "react";
import type { IdentityOption } from "../useIdentitySelector";

type Props = {
  showIdentityMenu: boolean;
  setShowIdentityMenu: React.Dispatch<React.SetStateAction<boolean>>;
  identityMenuRef: React.RefObject<HTMLDivElement | null>;
  hasIdentities: boolean;
  effectiveIdentity: IdentityOption | null;
  myDisplayName: string;
  safeIdentities: IdentityOption[];
  asKey: string;
  keyOf: (i: IdentityOption) => string;
  setAsKey: (k: string) => void;
  identityRef: React.MutableRefObject<IdentityOption | null>;
};

export default function ThreadIdentityMenu({
  showIdentityMenu,
  setShowIdentityMenu,
  identityMenuRef,
  hasIdentities,
  effectiveIdentity,
  myDisplayName,
  safeIdentities,
  asKey,
  keyOf,
  setAsKey,
  identityRef,
}: Props) {
  return (
    <div className="identity-select" ref={identityMenuRef}>
      <button
        type="button"
        className="identity-chip"
        onClick={(e) => {
          e.stopPropagation();
          setShowIdentityMenu((v) => !v);
        }}
        disabled={!hasIdentities}
        title="Choose identity"
      >
        {effectiveIdentity?.imageUrl ? (
          <img src={effectiveIdentity.imageUrl} alt="" />
        ) : (
          <div className="avatar-fallback">
            {((effectiveIdentity?.title ?? myDisplayName)[0] ?? "Y").toUpperCase()}
          </div>
        )}

        <div className="identity-chip-text">
          <div className="identity-title">{effectiveIdentity?.title ?? myDisplayName}</div>
          {effectiveIdentity?.subtitle && (
            <div className="identity-subtitle">{effectiveIdentity.subtitle}</div>
          )}
        </div>
      </button>

      {showIdentityMenu && (
        <div className="identity-menu">
          {safeIdentities.map((i) => {
            const k = keyOf(i);

            return (
              <button
                key={k}
                type="button"
                className={`identity-option ${k === asKey ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  identityRef.current = i;
                  setAsKey(k);
                  setShowIdentityMenu(false);
                }}
              >
                {i.imageUrl ? (
                  <img src={i.imageUrl} alt="" />
                ) : (
                  <div className="avatar-fallback">{i.title[0]?.toUpperCase()}</div>
                )}

                <div className="identity-option-text">
                  <div className="identity-title">{i.title}</div>
                  {i.subtitle && <div className="identity-subtitle">{i.subtitle}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}