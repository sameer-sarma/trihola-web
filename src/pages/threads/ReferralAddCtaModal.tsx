// src/pages/threads/ReferralAddCtaModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../components/Modal";
import ImageLightbox, { type LightboxItem } from "../../components/ImageLightbox";
import ContactMultiSelect, { type ContactLite } from "../../components/contacts/ContactMultiSelect";
import { useAppData } from "../../context/AppDataContext";
import { supabase } from "../../supabaseClient";

import type { ThreadCtaDTO } from "../../types/threads";
import "../../css/referral-add-cta.css";

type ReferralAddConfig = {
  message: string;
  requestedCount: number;
  referralDefaults?: {
    suggestedNote?: string | null;
    attachments?: Array<{
      id?: string;
      url: string;
      name: string;
      mime: string;
      sizeBytes?: number;
      kind?: string;
      path?: string;
    }>;
  };
};

type UiAttachment = {
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

type Props = {
  open: boolean;
  onClose: () => void;

  cta: ThreadCtaDTO | null;

  // Keep existing signature to avoid breaking callers.
  // We'll pass attachments via (referralDefaults) on the object using `as any` so you can wire it later.
  onSubmit: (args: {
    ctaId: string;
    threadId: string;
    referrals: Array<{
      prospectUserId: string; // needed for bulk create
      displayName: string;
      phone?: string;
      email?: string;
      note?: string;
    }>;
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

function displayName(c: ContactLite) {
  const fn = (c.firstName ?? "").trim();
  const ln = (c.lastName ?? "").trim();
  const n = `${fn} ${ln}`.trim();
  return n || (c.email ?? "") || (c.phone ?? "") || "Unknown";
}

function isImageMime(mime?: string | null) {
  const m = String(mime ?? "").toLowerCase();
  return m.startsWith("image/");
}

function formatShortDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { month: "short", day: "numeric" });
}

// Similar to ThreadPage helpers (kept local to avoid imports)
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

export default function ReferralAddCtaModal({ open, onClose, cta, onSubmit }: Props) {
  const nav = useNavigate();
  const { userContacts, contactsLoading, refreshContacts } = useAppData();

  // Always provide an array
  const contacts: ContactLite[] = useMemo(() => userContacts ?? [], [userContacts]);

  const cfg = useMemo(() => {
    if (!cta || String((cta as any).kind ?? "").toUpperCase() !== "REFERRAL_ADD") return null;
    return safeParseJson<ReferralAddConfig>((cta as any).configJson, {
      message: "",
      requestedCount: 0,
      referralDefaults: { suggestedNote: null, attachments: [] },
    });
  }, [cta]);

  // Linked/actioned info (new CTA payload)
  const linkedReferrals = useMemo<any[]>(() => (cta as any)?.linked?.referrals ?? [], [cta]);
  const linkedRecs = useMemo<any[]>(() => (cta as any)?.linked?.recommendations ?? [], [cta]);

  const doneCount = linkedReferrals.length + linkedRecs.length;
  const requestedCount = cfg?.requestedCount ?? 0;
  const remainingCount = Math.max(0, requestedCount - doneCount);

  const existingProspectIds = useMemo(() => {
    const set = new Set<string>();
    for (const r of linkedReferrals) {
      const pid = r?.prospect?.userId;
      if (pid) set.add(String(pid));
    }
    for (const r of linkedRecs) {
      const pid = r?.prospect?.userId;
      if (pid) set.add(String(pid));
    }
    return set;
  }, [linkedReferrals, linkedRecs]);

  // Exclude requester + assignee from selection
  // PLUS: also exclude any "target" userId from linked referrals (prevents picking the business/target again)
  const excludedIds = useMemo(() => {
    const set = new Set<string>();

    const cb = (cta as any)?.createdByBadge;
    if (cb?.participantType === "USER" && cb?.participantId) set.add(String(cb.participantId));

    const at = (cta as any)?.assignedToBadge;
    if (at?.participantType === "USER" && at?.participantId) set.add(String(at.participantId));

    for (const r of linkedReferrals) {
      const t = r?.target;
      if (t?.participantType === "USER" && t?.participantId) set.add(String(t.participantId));
    }

    return set;
  }, [cta, linkedReferrals]);

  const filterContact = useMemo(() => {
    return (c: ContactLite) => {
      const id = String((c as any).userId ?? "");
      if (!id) return false;
      if (existingProspectIds.has(id)) return false;
      if (excludedIds.has(id)) return false;
      return true;
    };
  }, [existingProspectIds, excludedIds]);

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

  // Contact picker modal open
  const [pickerOpen, setPickerOpen] = useState(false);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revokeObjectUrls();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          id: String(a.id ?? a.url),
          url: String(a.url),
          name: String(a.name ?? "Attachment"),
          mime: String(a.mime ?? ""),
          sizeBytes: a.sizeBytes,
          kind: a.kind,
          path: (a as any).path,
          _isObjectUrl: false,
        }))
    );

    setSelectedIds([]);
    setError(null);
    setShowActioned(false);
    setPickerOpen(false);

    revokeObjectUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, (cta as any)?.id]);

  // ---------- derived ----------
  const selectedContacts = useMemo(() => {
    const byId = new Map<string, ContactLite>();
    for (const c of contacts ?? []) byId.set(String((c as any).userId), c);
    return selectedIds.map((id) => byId.get(String(id))).filter(Boolean) as ContactLite[];
  }, [contacts, selectedIds]);

  const validReferrals = useMemo(() => {
    return selectedContacts
      .map((c) => {
        const name = displayName(c);
        const phone = String((c as any).phone ?? "").trim();
        const email = String((c as any).email ?? "").trim();
        if (!name) return null;

        // keep old behavior: require at least one
        if (!phone && !email) return null;

        return {
          prospectUserId: String((c as any).userId),
          displayName: name,
          phone: phone || undefined,
          email: email || undefined,
          note: note.trim() ? note.trim() : undefined,
        };
      })
      .filter(Boolean) as Array<{ prospectUserId: string; displayName: string; phone?: string; email?: string; note?: string }>;
  }, [selectedContacts, note]);

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

  // ---------- attachment upload (ThreadPage-like) ----------
  const ATTACH_BUCKET =
    (import.meta as any).env?.VITE_SUPABASE_BUCKET ||
    (import.meta as any).env?.VITE_STORAGE_BUCKET ||
    "profile-pictures";

  const ATTACH_FOLDER = "thread-attachments";

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

    // Optional: add local previews immediately (and then replace after upload)
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

    // show previews first
    setAttachments((prev) => [...prev, ...localPreview]);

    try {
      const out: UiAttachment[] = [];
      const uidSeg = safeSegment(uid);
      const threadSeg = safeSegment(threadId);

      for (const a of localPreview) {
        const f = a.file;
        if (!f) continue;

        const safeName = safeSegment(f.name || "file");
        const path = `${ATTACH_FOLDER}/user_${uidSeg}/${threadSeg}/${randomId()}_${safeName}`;

        const { error: upErr } = await supabase.storage.from(ATTACH_BUCKET).upload(path, f, {
          upsert: false,
          contentType: f.type || undefined,
        });
        if (upErr) throw upErr;

        const { data } = supabase.storage.from(ATTACH_BUCKET).getPublicUrl(path);
        const url = data?.publicUrl;
        if (!url) throw new Error("Failed to resolve public URL for attachment");

        out.push({
          id: a.id, // keep id so we can replace in-state
          url,
          name: f.name || "file",
          mime: f.type || "application/octet-stream",
          sizeBytes: f.size || 0,
          kind: kindFromMime(f.type || ""),
          path,
          _isObjectUrl: false,
        });
      }

      // Replace the preview entries with uploaded ones (same id), revoke blob urls
      setAttachments((prev) => {
        const byId = new Map(out.map((x) => [x.id, x]));
        return prev.map((p) => {
          const rep = byId.get(p.id);
          if (!rep) return p;

          // cleanup blob preview
          if (p._isObjectUrl && p.url) {
            try {
              URL.revokeObjectURL(p.url);
            } catch {
              // ignore
            }
            objectUrlsRef.current = objectUrlsRef.current.filter((u) => u !== p.url);
          }

          return rep;
        });
      });
    } catch (e: any) {
      // Remove previews we added (best effort)
      setAttachments((prev) => prev.filter((a) => !a._isObjectUrl));
      setError(e?.message ?? "Attachment upload failed");
    } finally {
      setUploadingAttachments(false);
    }
  }

  // ---------- actions ----------
  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const victim = prev.find((a) => a.id === id);
      if (victim?._isObjectUrl && victim.url) {
        try {
          URL.revokeObjectURL(victim.url);
        } catch {
          // ignore
        }
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

  async function handleSubmit() {
    if (!cta || String((cta as any).kind ?? "").toUpperCase() !== "REFERRAL_ADD") return;

    setError(null);

    if (uploadingAttachments) {
      setError("Please wait for attachments to finish uploading.");
      return;
    }

    if (validReferrals.length === 0) {
      setError("Select at least one contact with a phone/email.");
      return;
    }

    // Only send uploaded attachments (ignore blob previews)
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

    setBusy(true);
    try {
      // Keep signature-compatible, but include referralDefaults for the caller/backend to use.
      // You can later update the parent onSubmit typing + payload handling without changing UI.
      await onSubmit({
        ctaId: String((cta as any).id),
        threadId: String((cta as any).threadId),
        referrals: validReferrals,
        ...(uploadedAtt.length || note.trim()
          ? ({
              referralDefaults: {
                suggestedNote: note.trim() ? note.trim() : undefined,
                attachments: uploadedAtt.length ? uploadedAtt : undefined,
              },
            } as any)
          : {}),
      } as any);

      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to submit referrals.");
    } finally {
      setBusy(false);
    }
  }

  if (!cta || String((cta as any).kind ?? "").toUpperCase() !== "REFERRAL_ADD") return null;

  const requesterName = (cta as any)?.createdByBadge?.displayName || "Someone";
  const requesterImg = (cta as any)?.createdByBadge?.imageUrl || "";

  const canAct =
    Boolean((cta as any)?.canAct) ||
    String((cta as any)?.viewerRole ?? "").toUpperCase() === "ASSIGNEE";

  const footer = (
    <div className="th-ramFooter">
      <button className="th-ramBtn th-ramBtnSecondary" onClick={onClose} disabled={busy || uploadingAttachments}>
        {canAct ? "Cancel" : "Close"}
      </button>

      {canAct ? (
        <button
          className="th-ramBtn th-ramBtnPrimary"
          onClick={handleSubmit}
          disabled={busy || uploadingAttachments}
          title={uploadingAttachments ? "Uploading attachments…" : undefined}
        >
          {busy ? "Submitting..." : uploadingAttachments ? "Uploading…" : `Submit ${validReferrals.length} referral(s)`}
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <Modal open={open} onClose={onClose} title="Referral request" footer={footer} maxWidth={920}>
        <div className="th-ramBody">
          {/* ---------------- HEADER: chat-like message bubble ---------------- */}
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

              {/* request note styled like chat bubble (light-blue) */}
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
                  <div className="th-ramSectionTitle">Actioned {doneCount}/{requestedCount}</div>
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
                  {linkedReferrals.map((r: any) => {
                    const name =
                      r?.prospect?.firstName
                        ? `${r.prospect.firstName}${r.prospect.lastName ? " " + r.prospect.lastName : ""}`
                        : r?.prospect?.slug || "Prospect";
                    const img = r?.prospect?.profileImageUrl || "";
                    return (
                      <div key={String(r.referralId)} className="th-ramActionRow">
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
                        >
                          Open thread
                        </button>
                      </div>
                    );
                  })}

                  {linkedRecs.map((rec: any, idx: number) => {
                    const name = rec?.prospect?.displayName || rec?.prospect?.name || "Prospect";
                    const img = rec?.prospect?.imageUrl || "";
                    return (
                      <div key={String(rec.recommendationId ?? idx)} className="th-ramActionRow">
                        <div className="th-ramActionLeft">
                          <div className="th-ramMiniAvatar">{img ? <img src={img} alt={name} /> : null}</div>
                          <div className="th-ramActionMeta">
                            <div className="th-ramActionName">{name}</div>
                            <div className="th-ramActionSub">
                              <span className="th-ramTypePill">Recommendation</span>
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

{/* ---------------- Pending: STACKED VERTICALLY ---------------- */}
{canAct ? (
  <>
    <div className="th-ramSection th-ramPendingStack">
      <div className="th-ramPendingTopRow">
        <button
          className="th-ramBtn th-ramBtnPrimary th-ramBtnSmall"
          onClick={() => setPickerOpen(true)}
          disabled={busy || uploadingAttachments || remainingCount === 0}
          title={remainingCount === 0 ? "No more can be added" : "Add contacts"}
        >
          Select contacts to refer
        </button>

      </div>

      {selectedContacts.length > 0 ? (
        <div className="th-ramPills">
          {selectedContacts.map((c) => (
            <div className="th-ramPill" key={String((c as any).userId)}>
              <span className="th-ramPillText">{displayName(c)}</span>
              <button
                className="th-ramPillX"
                onClick={() =>
                  setSelectedIds((prev) => prev.filter((id) => String(id) !== String((c as any).userId)))
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

    {/* ---------------- Message to contacts ---------------- */}
      <div className="th-ramSection th-ramComposerSection">
        <div className="th-ramComposerHeaderRow">
          <div className="th-ramSectionTitle">Message</div>
        </div>

        <textarea
          className="th-ramNote th-ramNote--chatgpt"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Write a note that will be copied into each referral…"
          disabled={busy || uploadingAttachments}
        />

        {/* Attachments */}
        <div className="th-ramField" style={{ marginTop: 10 }}>
          <div className="th-ramAttachRow">
            <button
              className="th-ramBtn th-ramBtnSecondary th-ramBtnSmall"
              onClick={() => fileRef.current?.click()}
              disabled={busy || uploadingAttachments}
              title={uploadingAttachments ? "Uploading…" : undefined}
            >
              {uploadingAttachments ? "Uploading…" : `+ Attachment${attachments.length ? ` (${attachments.length})` : ""}`}
            </button>
            <input ref={fileRef} type="file" multiple style={{ display: "none" }} onChange={onFilePicked} />
          </div>

          {attachments.length > 0 ? (
            <div className="th-ramAttachGrid">
              {attachments.map((a) => (
                <div key={a.id} className="th-ramAttachCard">
                  <button
                    className="th-ramAttachRemove"
                    onClick={() => removeAttachment(a.id)}
                    disabled={busy || uploadingAttachments}
                    title="Remove"
                  >
                    ×
                  </button>

                  <a className="th-ramAttachLink" href={a.url} target="_blank" rel="noreferrer">
                    <div className="th-ramAttachName">{a.name}</div>
                    <div className="th-ramAttachMeta">
                      {a.mime || "file"}
                      {a._isObjectUrl ? " • pending upload" : ""}
                    </div>
                  </a>

                  {isImageMime(a.mime) ? (
                    <button
                      type="button"
                      className="th-ramAttachThumb"
                      onClick={() => !a._isObjectUrl && openLightboxAt(a.url)}
                      disabled={a._isObjectUrl}
                      title={a._isObjectUrl ? "Wait for upload to finish" : "Preview"}
                    >
                      <img src={a.url} alt={a.name} />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </>
  ) : null}

  {error ? <div className="th-ramError">{error}</div> : null}
        </div>
      </Modal>

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

      {lbOpen && (
        <ImageLightbox open={lbOpen} items={lbItems} startIndex={lbStartIndex} onClose={() => setLbOpen(false)} />
      )}
    </>
  );
}