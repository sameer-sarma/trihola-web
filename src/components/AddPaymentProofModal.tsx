import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import FileUploader from "../components/FileUploader";
import type {
  IdentityType,
  PaymentProofDraft,
  PaymentProofDraftAttachment,
  PaymentProofType,
} from "../types/orderTypes";
import {
  createEmptyPaymentProofDraft,
  createPaymentProofRequestFromDraft,
  makePaymentProofDraftAttachmentId,
} from "../types/orderTypes";
import "../css/AddPaymentProofModal.css";

const MEDIA_BUCKET = import.meta.env.VITE_SUPABASE_MEDIA_BUCKET;

export type AddPaymentProofModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (draft: PaymentProofDraft) => Promise<void> | void;
  initialValue?: PaymentProofDraft | null;
  userId: string;
  submittedByIdentityType: IdentityType;
  submittedByIdentityId: string;
};

function createDraftAttachment(type: PaymentProofType): PaymentProofDraftAttachment {
  return {
    id: makePaymentProofDraftAttachmentId(),
    type,
    attachmentUrl: "",
    referenceCode: "",
    comment: "",
    file: null,
    fileName: "",
    mimeType: "",
    sizeBytes: null,
    path: "",
  };
}

function cloneDraft(value?: PaymentProofDraft | null): PaymentProofDraft {
  const source = value ?? createEmptyPaymentProofDraft();

  return {
    comment: source.comment ?? "",
    attachments: (source.attachments ?? []).map((item) => ({ ...item })),
  };
}

function getAttachmentTitle(type: PaymentProofType): string {
  switch (type) {
    case "SCREENSHOT":
      return "Screenshot";
    case "RECEIPT":
      return "Receipt";
    case "TXN_ID":
      return "Transaction ID";
    case "NOTE":
      return "Note";
    default:
      return "Proof item";
  }
}

function getAttachmentSummary(item: PaymentProofDraftAttachment): string {
  switch (item.type) {
    case "SCREENSHOT":
    case "RECEIPT":
      return item.fileName || item.attachmentUrl || "No file added";
    case "TXN_ID":
      return item.referenceCode || "No reference added";
    case "NOTE":
      return item.comment || "No note added";
    default:
      return "";
  }
}

function isMeaningful(item: PaymentProofDraftAttachment): boolean {
  return !!(
    item.attachmentUrl?.trim() ||
    item.referenceCode?.trim() ||
    item.comment?.trim()
  );
}

export default function AddPaymentProofModal({
  isOpen,
  onClose,
  onSave,
  initialValue = null,
  userId,
  submittedByIdentityType,
  submittedByIdentityId,
}: AddPaymentProofModalProps) {
  const [draft, setDraft] = useState<PaymentProofDraft>(createEmptyPaymentProofDraft());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!isOpen) return;

    const nextDraft = cloneDraft(initialValue);
    setDraft(nextDraft);
    setExpandedId(nextDraft.attachments[0]?.id ?? null);
    setSaving(false);
    setErrorMessage("");
  }, [isOpen, initialValue]);

  const itemCountText = useMemo(() => {
    const count = draft.attachments.length;
    if (count === 0) return "No proof items added";
    if (count === 1) return "1 proof item";
    return `${count} proof items`;
  }, [draft.attachments.length]);

  function updateAttachment(
    id: string,
    updater: (item: PaymentProofDraftAttachment) => PaymentProofDraftAttachment
  ) {
    setDraft((current) => ({
      ...current,
      attachments: current.attachments.map((item) =>
        item.id === id ? updater(item) : item
      ),
    }));
  }

  function handleAdd(type: PaymentProofType) {
    const next = createDraftAttachment(type);

    setDraft((current) => ({
      ...current,
      attachments: [...current.attachments, next],
    }));

    setExpandedId(next.id);
  }

  function handleRemove(id: string) {
    setDraft((current) => {
      const nextAttachments = current.attachments.filter((item) => item.id !== id);
      if (expandedId === id) {
        setExpandedId(nextAttachments[0]?.id ?? null);
      }

      return {
        ...current,
        attachments: nextAttachments,
      };
    });
  }

  async function handleSubmit() {
    try {
      setSaving(true);
      setErrorMessage("");

      const cleanedDraft: PaymentProofDraft = {
        comment: draft.comment.trim(),
        attachments: draft.attachments
          .map((item) => ({
            ...item,
            attachmentUrl: item.attachmentUrl?.trim() || "",
            referenceCode: item.referenceCode?.trim() || "",
            comment: item.comment?.trim() || "",
            fileName: item.fileName?.trim() || "",
            mimeType: item.mimeType?.trim() || "",
            path: item.path?.trim() || "",
          }))
          .filter(isMeaningful),
      };

      const req = createPaymentProofRequestFromDraft(
        cleanedDraft,
        submittedByIdentityType,
        submittedByIdentityId
      );

      if (!req.attachments?.length && !req.comment?.trim()) {
        setErrorMessage("Please add at least one proof item or a comment.");
        return;
      }

      await onSave(cleanedDraft);
      onClose();
    } catch (e: any) {
      setErrorMessage(e?.message ?? "Failed to save payment proof.");
    } finally {
      setSaving(false);
    }
  }

    if (!isOpen) return null;

  return createPortal(
    <div className="payment-proof-backdrop" onClick={onClose}>
      <div
        className="payment-proof-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-proof-title"
      >
        <div className="payment-proof-header">
          <div>
            <h2 id="payment-proof-title">Add payment proof</h2>
            <p>{itemCountText}</p>
          </div>

          <button
            type="button"
            className="payment-proof-close"
            onClick={onClose}
            aria-label="Close payment proof"
            disabled={saving}
          >
            ×
          </button>
        </div>

        <div className="payment-proof-body">
          <label className="payment-proof-field payment-proof-field-full">
            <span>Comment</span>
            <textarea
              rows={2}
              value={draft.comment}
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  comment: e.target.value,
                }))
              }
              placeholder="Optional note about this payment"
              disabled={saving}
            />
          </label>

          <div className="payment-proof-add-row">
            <span className="payment-proof-add-label">Add proof item</span>

            <div className="payment-proof-add-actions">
              <button type="button" onClick={() => handleAdd("SCREENSHOT")} disabled={saving}>
                + Screenshot
              </button>
              <button type="button" onClick={() => handleAdd("RECEIPT")} disabled={saving}>
                + Receipt
              </button>
              <button type="button" onClick={() => handleAdd("TXN_ID")} disabled={saving}>
                + Txn ID
              </button>
              <button type="button" onClick={() => handleAdd("NOTE")} disabled={saving}>
                + Note
              </button>
            </div>
          </div>

          {draft.attachments.length === 0 ? (
            <div className="payment-proof-empty">No proof items added yet.</div>
          ) : (
            <div className="payment-proof-entry-list">
              {draft.attachments.map((item, index) => {
                const isExpanded = expandedId === item.id;
                const isUploadType =
                  item.type === "SCREENSHOT" || item.type === "RECEIPT";

                return (
                  <div className="payment-proof-entry-card" key={item.id}>
                    <button
                      type="button"
                      className="payment-proof-entry-head"
                      onClick={() =>
                        setExpandedId((current) =>
                          current === item.id ? null : item.id
                        )
                      }
                      disabled={saving}
                    >
                      <span className="payment-proof-entry-head-left">
                        <span className="payment-proof-entry-index">{index + 1}</span>
                        <span>
                          <strong>{getAttachmentTitle(item.type)}</strong>
                          <small>{getAttachmentSummary(item)}</small>
                        </span>
                      </span>

                      <span className="payment-proof-entry-toggle">
                        {isExpanded ? "−" : "+"}
                      </span>
                    </button>

                    {isExpanded ? (
                      <div className="payment-proof-entry-body">
                        <div className="payment-proof-grid">
                          {isUploadType ? (
                            <>
                              <div className="payment-proof-field payment-proof-field-full">
                                <span>
                                  {item.type === "SCREENSHOT"
                                    ? "Upload screenshot"
                                    : "Upload receipt"}
                                </span>

                                <FileUploader
                                  userId={userId}
                                  bucket={MEDIA_BUCKET}
                                  folder="payment-proofs"
                                  filenameBase={`proof_${item.id}`}
                                  accept="image/*,.pdf"
                                  label="Choose file"
                                  help="Upload image or PDF"
                                  strategy="unique"
                                  onComplete={(files) => {
                                    const file = files[0];
                                    if (!file) return;

                                    updateAttachment(item.id, (current) => ({
                                      ...current,
                                      attachmentUrl: file.publicUrl,
                                      fileName: file.fileName,
                                      mimeType: file.mimeType,
                                      sizeBytes: file.size,
                                      path: file.path,
                                      file: null,
                                    }));
                                  }}
                                />
                              </div>

                              {item.attachmentUrl ? (
                                <div className="payment-proof-file-preview payment-proof-field-full">
                                  {item.mimeType?.startsWith("image/") ? (
                                    <img
                                      src={item.attachmentUrl}
                                      alt={item.fileName || item.type}
                                    />
                                  ) : (
                                    <a
                                      href={item.attachmentUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="payment-proof-file-link"
                                    >
                                      {item.fileName || "Open uploaded file"}
                                    </a>
                                  )}
                                </div>
                              ) : null}

                              <label className="payment-proof-field payment-proof-field-full">
                                <span>Comment</span>
                                <textarea
                                  rows={2}
                                  value={item.comment ?? ""}
                                  onChange={(e) =>
                                    updateAttachment(item.id, (current) => ({
                                      ...current,
                                      comment: e.target.value,
                                    }))
                                  }
                                  placeholder="Optional note"
                                  disabled={saving}
                                />
                              </label>
                            </>
                          ) : null}

                          {item.type === "TXN_ID" ? (
                            <>
                              <label className="payment-proof-field payment-proof-field-full">
                                <span>Transaction ID / UTR / Reference</span>
                                <input
                                  value={item.referenceCode ?? ""}
                                  onChange={(e) =>
                                    updateAttachment(item.id, (current) => ({
                                      ...current,
                                      referenceCode: e.target.value,
                                    }))
                                  }
                                  placeholder="Enter transaction reference"
                                  disabled={saving}
                                />
                              </label>

                              <label className="payment-proof-field payment-proof-field-full">
                                <span>Comment</span>
                                <textarea
                                  rows={2}
                                  value={item.comment ?? ""}
                                  onChange={(e) =>
                                    updateAttachment(item.id, (current) => ({
                                      ...current,
                                      comment: e.target.value,
                                    }))
                                  }
                                  placeholder="Optional note"
                                  disabled={saving}
                                />
                              </label>
                            </>
                          ) : null}

                          {item.type === "NOTE" ? (
                            <label className="payment-proof-field payment-proof-field-full">
                              <span>Note</span>
                              <textarea
                                rows={3}
                                value={item.comment ?? ""}
                                onChange={(e) =>
                                  updateAttachment(item.id, (current) => ({
                                    ...current,
                                    comment: e.target.value,
                                  }))
                                }
                                placeholder="Add note"
                                disabled={saving}
                              />
                            </label>
                          ) : null}
                        </div>

                        <div className="payment-proof-entry-actions">
                          <button
                            type="button"
                            className="payment-proof-remove-btn"
                            onClick={() => handleRemove(item.id)}
                            disabled={saving}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {errorMessage ? (
            <div className="payment-proof-error">{errorMessage}</div>
          ) : null}
        </div>

        <div className="payment-proof-footer">
          <button
            type="button"
            className="payment-proof-secondary-btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="payment-proof-primary-btn"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save payment proof"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}