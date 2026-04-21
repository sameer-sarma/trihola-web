// src/pages/threads/RecommendationCtaModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import ImageLightbox, { type LightboxItem } from "../../components/ImageLightbox";
import ContactMultiSelect, { type ContactLite } from "../../components/contacts/ContactMultiSelect";
import { useAppData } from "../../context/AppDataContext";
import { supabase } from "../../supabaseClient";
import type { ThreadCtaDTO } from "../../types/threads";

import "../../css/referral-add-cta.css";

export type UiAttachment = {
  id: string;
  url: string;
  name: string;
  mime: string;
  sizeBytes?: number;
  kind?: string;
  path?: string;

  // if true: local preview only (blob:) and not uploaded yet
  _isObjectUrl?: boolean;
  file?: File;
};

function isImageMime(mime?: string | null) {
  const m = String(mime ?? "").toLowerCase();
  return m.startsWith("image/");
}

// Same helpers as ReferralAddCtaModal (kept local to avoid imports)
function randomId() {
  return Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
}
function safeSegment(v: string) {
  return String(v || "")
    .trim()
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 140);
}
function kindFromMime(mime: string) {
  const m = String(mime || "").toLowerCase();
  if (m.startsWith("image/")) return "IMAGE";
  if (m.startsWith("video/")) return "VIDEO";
  if (m.startsWith("audio/")) return "AUDIO";
  if (m.includes("pdf")) return "PDF";
  return "FILE";
}

type RecommendationConfig = {
  message: string;
  requestedCount: number;
  referralDefaults?: {
    suggestedNote?: string | null;
    attachments?: Array<{
      id?: string;
      url: string;
      name?: string;
      mime?: string;
      sizeBytes?: number;
      kind?: string;
      path?: string;
    }>;
  };
};

export type TargetPick = {
  targetType: "USER" | "BUSINESS";
  targetUserId?: string;
  targetBusinessId?: string;
  displayName: string;
};

type Props = {
  open: boolean;
  onClose: () => void;

  cta: ThreadCtaDTO | null;

  onSubmit: (args: {
    ctaId: string;
    threadId: string;
    targets: TargetPick[];
    note?: string;
    referralDefaults?: {
      suggestedNote?: string;
      attachments?: UiAttachment[];
    };
  }) => Promise<void>;
};

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function clean(v?: string | null) {
  const s = String(v ?? "").trim();
  return s ? s : "";
}

function displayName(c: ContactLite) {
  // Prefer business labels first (because business contacts won't have first/last)
  const businessName = clean((c as any).businessName) || clean((c as any).name);
  if (businessName) return businessName;

  // Then normal person name
  const fn = clean(c.firstName);
  const ln = clean(c.lastName);
  const n = `${fn} ${ln}`.trim();
  if (n) return n;

  // Finally fallbacks
  return clean(c.email) || clean(c.phone) || "Unknown";
}

function formatShortDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric" });
}

function fmtBytes(n?: number | null) {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v) || v <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let x = v;
  while (x >= 1024 && i < units.length - 1) {
    x /= 1024;
    i++;
  }
  const dp = i <= 1 ? 0 : 1;
  return `${x.toFixed(dp)} ${units[i]}`;
}

export default function RecommendationAddCtaModal({ open, onClose, cta, onSubmit }: Props) {
  const nav = useNavigate();
  const { userContacts, businessContacts, contactsLoading, refreshContacts } = useAppData() as any;

  const contacts: ContactLite[] = useMemo(() => {
    const u = (userContacts ?? []) as ContactLite[];
    const b = (businessContacts ?? []) as ContactLite[];
    return [...u, ...b];
  }, [userContacts, businessContacts]);

  const cfg = useMemo(() => {
    if (!cta || String((cta as any).kind ?? "").toUpperCase() !== "RECOMMEND_BUSINESS") return null;

    return safeParseJson<RecommendationConfig>((cta as any).configJson, {
      message: "",
      requestedCount: 0,
      referralDefaults: { suggestedNote: null, attachments: [] },
    });
  }, [cta]);

  // Linked/actioned info
  // IMPORTANT: RECOMMEND_BUSINESS can be fulfilled by creating referrals OR recommendations
  const linkedReferrals = useMemo<any[]>(() => (cta as any)?.linked?.referrals ?? [], [cta]);
  const linkedRecs = useMemo<any[]>(() => (cta as any)?.linked?.recommendations ?? [], [cta]);

  const doneCount = linkedReferrals.length + linkedRecs.length;
  const requestedCount = cfg?.requestedCount ?? 0;
  const remainingCount = Math.max(0, requestedCount - doneCount);

  // Exclude requester + assignee from selection
  const excludedIds = useMemo(() => {
    const set = new Set<string>();

    const cb = (cta as any)?.createdByBadge;
    if ((cb?.participantType === "USER" || cb?.participantType === "BUSINESS") && cb?.participantId) {
      set.add(String(cb.participantId));
    }

    const at = (cta as any)?.assignedToBadge;
    if ((at?.participantType === "USER" || at?.participantType === "BUSINESS") && at?.participantId) {
      set.add(String(at.participantId));
    }

    return set;
  }, [cta]);

  // IMPORTANT: "already done" is based on TARGET for both linked referrals and linked recommendations
  const existingTargetIds = useMemo(() => {
    const set = new Set<string>();

    for (const r of linkedReferrals) {
      const tid = r?.target?.participantId;
      if (tid) set.add(String(tid));
    }
    for (const r of linkedRecs) {
      const tid = r?.target?.participantId;
      if (tid) set.add(String(tid));
    }

    return set;
  }, [linkedReferrals, linkedRecs]);

  const filterContact = useMemo(() => {
    return (c: ContactLite) => {
      const uid = String((c as any).userId ?? "").trim();
      const bid = String((c as any).businessId ?? "").trim();
      const pid = uid || bid; // what we submit as target id

      if (!pid) return false;
      if (excludedIds.has(pid)) return false;
      if (existingTargetIds.has(pid)) return false;

      return true;
    };
  }, [excludedIds, existingTargetIds]);

  // ---------- state ----------
  const [note, setNote] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [attachments, setAttachments] = useState<UiAttachment[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);

  const fileRef = useRef<HTMLInputElement | null>(null);

  // Actioned collapsible
  const [showActioned, setShowActioned] = useState(false);

  // lightbox
  const [lbOpen, setLbOpen] = useState(false);
  const [lbItems, setLbItems] = useState<LightboxItem[]>([]);
  const [lbStartIndex, setLbStartIndex] = useState(0);

  // Track object URLs so we can revoke them
  const objectUrlsRef = useRef<string[]>([]);
  const revokeObjectUrls = () => {
    const urls = objectUrlsRef.current;
    if (!urls.length) return;
    objectUrlsRef.current = [];
    for (const u of urls) {
      try {
        URL.revokeObjectURL(u);
      } catch {
        // ignore
      }
    }
  };

  useEffect(() => {
    return () => {
      revokeObjectUrls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Contact picker modal open
  const [pickerOpen, setPickerOpen] = useState(false);

  // If modal opens and cache is empty, try to refresh once
  useEffect(() => {
    if (!open) return;
    if ((userContacts?.length ?? 0) > 0) return;
    if (contactsLoading) return;

    refreshContacts().catch(() => {
      // don't block modal
    });
  }, [open, userContacts?.length, contactsLoading, refreshContacts]);

  // Reset on open/cta change
  useEffect(() => {
    if (!open) return;

    const suggested = (cfg?.referralDefaults?.suggestedNote ?? "").trim();
    setNote(suggested);

    const cfgAtt = Array.isArray(cfg?.referralDefaults?.attachments) ? cfg!.referralDefaults!.attachments! : [];
    setAttachments(
      cfgAtt
        .filter((a) => !!a?.url)
        .map((a) => ({
          id: String((a as any).id ?? a.url),
          url: String(a.url),
          name: String(a.name ?? "Attachment"),
          mime: String(a.mime ?? ""),
          sizeBytes: (a as any).sizeBytes,
          kind: (a as any).kind,
          path: (a as any).path,
          _isObjectUrl: false,
        }))
    );

    setSelectedIds([]);
    setError(null);
    setPickerOpen(false);
    setShowActioned(false);

    revokeObjectUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, (cta as any)?.id]);

  const imageItems = useMemo<LightboxItem[]>(() => {
    return attachments
      .filter((a) => isImageMime(a.mime) && a.url)
      .map((a) => ({
        src: a.url,
        alt: a.name,
        title: a.name,
        openUrl: a.url,
      }));
  }, [attachments]);

  const openLightboxAt = (url: string) => {
    const idx = imageItems.findIndex((x) => x.src === url);
    setLbItems(imageItems);
    setLbStartIndex(idx >= 0 ? idx : 0);
    setLbOpen(true);
  };

  // ---------- attachment upload ----------
  const ATTACH_BUCKET =
    (import.meta as any).env?.VITE_SUPABASE_BUCKET ||
    (import.meta as any).env?.VITE_STORAGE_BUCKET ||
    "profile-pictures";

  // Match ReferralAddCtaModal convention
  const ATTACH_FOLDER = "cta-attachments";

  async function getCurrentUserId(): Promise<string | null> {
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data?.user?.id ?? null;
  }

  async function uploadAttachments(files: File[]) {
    if (!files.length) return;
    if (!cta) return;

    const threadId = String((cta as any).threadId || "");
    if (!threadId) {
      setError("Missing threadId for attachment upload.");
      return;
    }

    const uid = await getCurrentUserId();
    if (!uid) {
      setError("Not logged in.");
      return;
    }

    setUploadingAttachments(true);
    setError(null);

    const localPreview: UiAttachment[] = files.map((f) => {
      const url = URL.createObjectURL(f);
      objectUrlsRef.current.push(url);
      return {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        url,
        name: f.name || "file",
        mime: f.type || "application/octet-stream",
        sizeBytes: f.size || 0,
        kind: kindFromMime(f.type || ""),
        _isObjectUrl: true,
        file: f,
      };
    });

    setAttachments((prev) => [...prev, ...localPreview]);

    try {
      const out: UiAttachment[] = [];
      const uidSeg = safeSegment(uid);
      const threadSeg = safeSegment(threadId);

      for (const a of localPreview) {
        const f = a.file;
        if (!f) continue;

        const safeName = safeSegment(f.name || "file");
        // folder matches your configJson example:
        // cta-attachments/user_<uid>/recommendation_request_<threadId>/<uuid>_<filename>
        const path = `${ATTACH_FOLDER}/user_${uidSeg}/recommendation_request_${threadSeg}/${randomId()}_${safeName}`;

        const { error: upErr } = await supabase.storage.from(ATTACH_BUCKET).upload(path, f, {
          upsert: false,
          contentType: f.type || undefined,
        });
        if (upErr) throw upErr;

        const { data } = supabase.storage.from(ATTACH_BUCKET).getPublicUrl(path);
        const url = data?.publicUrl;
        if (!url) throw new Error("Failed to resolve public URL for attachment");

        out.push({
          id: a.id,
          url,
          name: f.name || "file",
          mime: f.type || "application/octet-stream",
          sizeBytes: f.size || 0,
          kind: kindFromMime(f.type || ""),
          path,
          _isObjectUrl: false,
        });
      }

      setAttachments((prev) => {
        const byId = new Map(out.map((x) => [x.id, x]));
        return prev.map((p) => {
          const rep = byId.get(p.id);
          if (!rep) return p;

          if (p._isObjectUrl && p.url) {
            try {
              URL.revokeObjectURL(p.url);
            } catch {}
            objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== p.url);
          }

          return rep;
        });
      });
    } catch (e: any) {
      setAttachments((prev) => prev.filter((a) => !a._isObjectUrl));
      setError(e?.message ?? "Attachment upload failed");
    } finally {
      setUploadingAttachments(false);
    }
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const victim = prev.find((a) => a.id === id);
      if (victim?._isObjectUrl && victim.url) {
        try {
          URL.revokeObjectURL(victim.url);
        } catch {}
        objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== victim.url);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    await uploadAttachments(files);
  };

  // ---------- derived ----------
  const selectedContacts = useMemo(() => {
    const byId = new Map<string, ContactLite>();
    for (const c of contacts ?? []) {
      const id = String((c as any).id ?? (c as any).userId ?? (c as any).businessId ?? "");
      if (id) byId.set(id, c);
    }
    return selectedIds.map((id) => byId.get(String(id))).filter(Boolean) as ContactLite[];
  }, [contacts, selectedIds]);

  const pickedTargets: TargetPick[] = useMemo(() => {
    return selectedContacts
      .map((c) => {
        const uid = String((c as any).userId ?? "").trim();
        const bid = String((c as any).businessId ?? "").trim();
        if (uid) return { targetType: "USER" as const, targetUserId: uid, displayName: displayName(c) };
        if (bid) return { targetType: "BUSINESS" as const, targetBusinessId: bid, displayName: displayName(c) };
        return null;
      })
      .filter(Boolean) as TargetPick[];
  }, [selectedContacts]);

  const requesterName = (cta as any)?.createdByBadge?.displayName || "Someone";
  const requesterImg = (cta as any)?.createdByBadge?.imageUrl || "";

  // IMPORTANT: trust server canAct; no fallback that would accidentally enable CREATOR
  const canAct = Boolean((cta as any)?.canAct);

  async function handleSubmit() {
    if (!cta || String((cta as any).kind ?? "").toUpperCase() !== "RECOMMEND_BUSINESS") return;

    setError(null);

    if (uploadingAttachments) {
      setError("Please wait for attachments to finish uploading.");
      return;
    }

    if (!canAct) {
      setError("This request is not actionable from your current view.");
      return;
    }

    if (remainingCount <= 0) {
      setError("This request is already completed.");
      return;
    }

    const targets = pickedTargets.slice(0, remainingCount);
    if (!targets.length) {
      setError("Select at least one contact.");
      return;
    }

    setBusy(true);
    try {
      const uploadedAtt = attachments
        .filter((a) => !a._isObjectUrl && !!a.url)
        .map((a) => ({
          id: a.id,
          url: a.url,
          name: a.name,
          mime: a.mime,
          sizeBytes: a.sizeBytes,
          kind: a.kind,
          path: a.path,
        }));

      await onSubmit({
        ctaId: String((cta as any).id),
        threadId: String((cta as any).threadId),
        targets,
        note: note.trim() ? note.trim() : undefined,
        referralDefaults: {
          suggestedNote: (cfg?.referralDefaults?.suggestedNote ?? "").trim() || undefined,
          attachments: uploadedAtt.length ? uploadedAtt : undefined,
        },
      });

      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to submit recommendations.");
    } finally {
      setBusy(false);
    }
  }

  if (!cta || String((cta as any).kind ?? "").toUpperCase() !== "RECOMMEND_BUSINESS") return null;

  const submitCount = Math.min(pickedTargets.length, remainingCount);

  const footer = (
    <div className="th-ramFooter">
      <button className="th-ramBtn th-ramBtnSecondary" onClick={onClose} disabled={busy || uploadingAttachments}>
        {canAct ? "Cancel" : "Close"}
      </button>

      {canAct ? (
        <button
          className="th-ramBtn th-ramBtnPrimary"
          onClick={handleSubmit}
          disabled={busy || uploadingAttachments || submitCount <= 0}
          title={uploadingAttachments ? "Uploading attachments…" : remainingCount === 0 ? "Nothing remaining" : undefined}
        >
          {busy ? "Submitting..." : uploadingAttachments ? "Uploading…" : `Submit ${submitCount} recommendation(s)`}
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={onClose} title="Recommendation request" footer={footer} maxWidth={920}>
        <div className="th-ramBody">

          {/* Header: chat-like bubble */}
          <div className="th-ramHeader th-ramHeader--chat">
            <div className="th-ramHeaderAvatar">
              {requesterImg ? (
                <img src={requesterImg} alt={requesterName} />
              ) : (
                <span className="th-ramHeaderAvatarText">{(requesterName || "T").charAt(0)}</span>
              )}
            </div>

            <div className="th-ramHeaderMain">
              <div className="th-ramHeaderName">{requesterName}</div>

              <div className="th-ramChatBubble th-ramChatBubble--mine">
                <div className="th-ramChatText">{cfg?.message || ""}</div>
              </div>

              <div className="th-ramHeaderMeta">
                Requested {requestedCount} • Done {doneCount}
                {(cta as any)?.expiresAt ? ` • Expires ${formatShortDate((cta as any).expiresAt)}` : ""}
              </div>
            </div>
          </div>

          {/* ---------------- Actioned subpanel under header ---------------- */}
          {doneCount > 0 ? (
            <div className="th-ramSection th-ramActionedCompact">
              <div className="th-ramActionedTop">
                <div>
                  <div className="th-ramSectionTitle">
                    Actioned {doneCount}/{requestedCount}
                  </div>
                  <div className="th-ramMuted">Already created from this request.</div>
                </div>
                <button
                  className="th-ramBtn th-ramBtnSecondary th-ramBtnSmall"
                  onClick={() => setShowActioned((v) => !v)}
                >
                  {showActioned ? "Hide" : "Show"}
                </button>
              </div>

              {showActioned ? (
                <div className="th-ramActionedList">
                  {linkedReferrals.map((r: any, idx: number) => {
                    const key = String(r?.referralId ?? r?.threadId ?? idx);

                    const t = r?.target;
                    const name = t?.displayName || "Referral";
                    const img = t?.imageUrl || "";

                    return (
                      <div key={key} className="th-ramActionRow">
                        <div className="th-ramActionLeft">
                          <div className="th-ramMiniAvatar">{img ? <img src={img} alt={name} /> : null}</div>
                          <div className="th-ramActionMeta">
                            <div className="th-ramActionName">{name}</div>
                            <div className="th-ramActionSub">
                              <span className="th-ramTypePill">Referral</span>
                              <span className="th-ramDot">•</span>
                              <span className="th-ramStatus">{String(r?.status ?? "-")}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          className="th-ramBtn th-ramBtnSecondary th-ramBtnSmall"
                          onClick={() => {
                            if (r?.threadId) {
                              onClose();
                              nav(`/threads/${String(r.threadId)}`);
                            }
                          }}
                          disabled={!r?.threadId}
                          title={!r?.threadId ? "No thread available yet" : "Open thread"}
                        >
                          Open thread
                        </button>
                      </div>
                    );
                  })}

                  {linkedRecs.map((rec: any, idx: number) => {
                    const key = String(rec?.recommendationId ?? rec?.threadId ?? idx);

                    const t = rec?.target;
                    const name = t?.displayName || "Recommendation";
                    const img = t?.imageUrl || "";

                    return (
                      <div key={key} className="th-ramActionRow">
                        <div className="th-ramActionLeft">
                          <div className="th-ramMiniAvatar">{img ? <img src={img} alt={name} /> : null}</div>
                          <div className="th-ramActionMeta">
                            <div className="th-ramActionName">{name}</div>
                            <div className="th-ramActionSub">
                              <span className="th-ramTypePill">Recommendation</span>
                              <span className="th-ramDot">•</span>
                              <span className="th-ramStatus">{String(rec?.status ?? "-")}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          className="th-ramBtn th-ramBtnSecondary th-ramBtnSmall"
                          onClick={() => {
                            if (rec?.threadId) {
                              onClose();
                              nav(`/threads/${String(rec.threadId)}`);
                            }
                          }}
                          disabled={!rec?.threadId}
                          title={!rec?.threadId ? "No thread available yet" : "Open thread"}
                        >
                          Open thread
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Pending selection + composer */}
          {canAct ? (
            <>
              <div className="th-ramSection th-ramPendingStack" style={{ marginTop: 14 }}>
                <div className="th-ramPendingStackTop">
                  <button
                    className="th-ramBtn th-ramBtnPrimary th-ramBtnSmall"
                    onClick={() => setPickerOpen(true)}
                    disabled={busy || uploadingAttachments || remainingCount === 0}
                    title={remainingCount === 0 ? "No more can be added" : "Select contacts"}
                  >
                    Select Contacts to Recommend
                  </button>

                  <div className="th-ramPendingStackMeta">
                    <span className="th-ramChip">
                      {selectedIds.length}/{remainingCount} selected
                    </span>
                  </div>
                </div>

                {selectedContacts.length > 0 ? (
                  <div className="th-ramPills">
                    {selectedContacts.map((c) => (
                      <div
                        className="th-ramPill"
                        key={String((c as any).id ?? (c as any).userId ?? (c as any).businessId)}
                      >
                        <span className="th-ramPillText">{displayName(c)}</span>
                        <button
                          className="th-ramPillX"
                          onClick={() =>
                            setSelectedIds((prev) =>
                              prev.filter(
                                (id) =>
                                  String(id) !==
                                  String((c as any).id ?? (c as any).userId ?? (c as any).businessId)
                              )
                            )
                          }
                          aria-label="Remove"
                          disabled={busy || uploadingAttachments}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="th-ramSection th-ramComposerSection">
                <div className="th-ramComposerHeader">
                  <div className="th-ramSectionTitle">Message</div>
                </div>

                <textarea
                  className="th-ramNote th-ramNote--chatgpt"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Write a note that will be copied into each recommendation…"
                  disabled={busy || uploadingAttachments}
                />

                {/* Attachments list */}
                {attachments.length > 0 ? (
                  <div className="th-ctaDefaultsAttachments" style={{ marginTop: 10 }}>
                    {attachments.map((a) => (
                      <div key={a.id} className="th-ctaAttachmentRow" style={{ display: "flex" }}>
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          title={a.name}
                          style={{ display: "flex", flex: 1, textDecoration: "none" }}
                          onClick={(e) => {
                            if (isImageMime(a.mime)) {
                              e.preventDefault();
                              openLightboxAt(a.url);
                            }
                          }}
                        >
                          <span className="th-ctaAttachmentIcon">{isImageMime(a.mime) ? "🖼️" : "📎"}</span>
                          <span className="th-ctaAttachmentMeta">
                            <span className="th-ctaAttachmentName">{a.name}</span>
                            <span className="th-ctaAttachmentSub">
                              {a.mime || "file"}
                              {a.sizeBytes ? ` · ${fmtBytes(a.sizeBytes)}` : ""}
                              {a._isObjectUrl ? " · uploading…" : ""}
                            </span>
                          </span>
                          <span className="th-ctaAttachmentOpen">{isImageMime(a.mime) ? "Preview" : "Open"}</span>
                        </a>

                        <button
                          className="th-ramBtn th-ramBtnSecondary th-ramBtnSmall"
                          onClick={() => removeAttachment(a.id)}
                          disabled={busy || uploadingAttachments}
                          style={{ marginLeft: 10, alignSelf: "center" }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div style={{ marginTop: 10 }}>
                  <label className="th-ramBtn th-ramBtnSecondary th-ramBtnSmall" style={{ display: "inline-block" }}>
                    + Add attachment
                    <input
                      type="file"
                      multiple
                      style={{ display: "none" }}
                      ref={fileRef}
                      onChange={onFilePicked}
                      disabled={busy || uploadingAttachments}
                    />
                  </label>
                </div>
              </div>
            </>
          ) : null}

          {error ? <div className="th-ramError">{error}</div> : null}
        </div>
      </Modal>

      <ImageLightbox open={lbOpen} onClose={() => setLbOpen(false)} items={lbItems} startIndex={lbStartIndex} />

      {/* Contact picker modal */}
      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Select contacts"
        maxWidth={860}
        footer={
          <div className="th-ramFooter">
            <button
              className="th-ramBtn th-ramBtnSecondary"
              onClick={() => setPickerOpen(false)}
              disabled={busy || uploadingAttachments}
            >
              Done
            </button>
          </div>
        }
      >
        <div className="th-ramPickerBody">
          {contactsLoading && contacts.length === 0 ? (
            <div className="th-ramMuted" style={{ padding: "8px 0" }}>
              Loading contacts…
            </div>
          ) : null}

          <div className="th-ramContactList">
            <ContactMultiSelect
              contacts={contacts}
              value={selectedIds}
              onChange={(ids) => {
                const uniq = Array.from(new Set(ids.map(String)));
                setSelectedIds(uniq.slice(0, remainingCount));
              }}
              placeholder="Search name, phone, email…"
              showBulkActions
              showAddContact
              addContactLabel="+ Add contact"
              refreshAfterAdd={refreshContacts}
              optimisticAppendOnAdd={true}
              filterContact={filterContact}
            />
          </div>

          <div className="th-ramPickerHint">
            {remainingCount === 0 ? "No more can be selected for this request." : `You can select up to ${remainingCount}.`}
          </div>
        </div>
      </Modal>
    </>
  );
}