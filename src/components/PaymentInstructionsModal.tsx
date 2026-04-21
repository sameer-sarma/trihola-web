import { useEffect, useMemo, useState } from "react";
import FileUploader from "../components/FileUploader";
import type {
  PaymentInstructionDraftEntry,
  PaymentInstructionType,
  PaymentInstructionsDraft,
} from "../types/paymentInstruction";
import {
  createEmptyPaymentInstructionsDraft,
  makePaymentInstructionId,
} from "../types/paymentInstruction";
import "../css/PaymentInstructionsModal.css";

export type PaymentInstructionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: PaymentInstructionsDraft | null;
  onSave: (value: PaymentInstructionsDraft) => void;
  userId: string;
};

const MEDIA_BUCKET = import.meta.env.VITE_SUPABASE_MEDIA_BUCKET;

function createEntry(type: PaymentInstructionType): PaymentInstructionDraftEntry {
  const id = makePaymentInstructionId();

  switch (type) {
    case "PHONE":
      return {
        id,
        type: "PHONE",
        label: "",
        phoneNumber: "",
      };

    case "UPI_ID":
      return {
        id,
        type: "UPI_ID",
        label: "",
        upiId: "",
      };

    case "QR_CODE":
      return {
        id,
        type: "QR_CODE",
        label: "",
        fileUrl: "",
        fileName: "",
        mimeType: "",
        sizeBytes: null,
        path: "",
        file: null,
      };

    case "NEFT":
      return {
        id,
        type: "NEFT",
        label: "",
        accountName: "",
        accountNumber: "",
        ifscCode: "",
        bankName: "",
        branchName: "",
      };

    default:
      return {
        id,
        type: "PHONE",
        label: "",
        phoneNumber: "",
      };
  }
}

function cloneDraft(value?: PaymentInstructionsDraft | null): PaymentInstructionsDraft {
  const source = value ?? createEmptyPaymentInstructionsDraft();

  return {
    text: source.text ?? "",
    entries: (source.entries ?? []).map((entry) => ({ ...entry })),
  };
}

function getEntryTitle(entry: PaymentInstructionDraftEntry): string {
  switch (entry.type) {
    case "PHONE":
      return "Phone number";
    case "UPI_ID":
      return "UPI ID";
    case "QR_CODE":
      return "QR code";
    case "NEFT":
      return "NEFT details";
    default:
      return "Entry";
  }
}

function getEntrySummary(entry: PaymentInstructionDraftEntry): string {
  switch (entry.type) {
    case "PHONE":
      return entry.phoneNumber || "No number added";
    case "UPI_ID":
      return entry.upiId || "No UPI ID added";
    case "QR_CODE":
      return entry.fileName || entry.fileUrl || "No QR code uploaded";
    case "NEFT":
      return entry.accountNumber || "No account number added";
    default:
      return "";
  }
}

function isEntryMeaningful(entry: PaymentInstructionDraftEntry): boolean {
  switch (entry.type) {
    case "PHONE":
      return !!entry.phoneNumber.trim() || !!entry.label.trim();
    case "UPI_ID":
      return !!entry.upiId.trim() || !!entry.label.trim();
    case "QR_CODE":
      return !!entry.fileUrl?.trim() || !!entry.fileName?.trim() || !!entry.label.trim();
    case "NEFT":
      return (
        !!entry.accountName.trim() ||
        !!entry.accountNumber.trim() ||
        !!entry.ifscCode.trim() ||
        !!entry.bankName.trim() ||
        !!entry.branchName.trim() ||
        !!entry.label.trim()
      );
    default:
      return false;
  }
}

export default function PaymentInstructionsModal({
  isOpen,
  onClose,
  initialValue = null,
  onSave,
  userId,
}: PaymentInstructionsModalProps) {
  const [draft, setDraft] = useState<PaymentInstructionsDraft>(
    createEmptyPaymentInstructionsDraft()
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const nextDraft = cloneDraft(initialValue);
    setDraft(nextDraft);
    setExpandedId(nextDraft.entries[0]?.id ?? null);
  }, [isOpen, initialValue]);

  const entryCountText = useMemo(() => {
    const count = draft.entries.length;
    if (count === 0) return "No payment methods added";
    if (count === 1) return "1 payment method";
    return `${count} payment methods`;
  }, [draft.entries.length]);

  function updateEntry(
    id: string,
    updater: (entry: PaymentInstructionDraftEntry) => PaymentInstructionDraftEntry
  ) {
    setDraft((current) => ({
      ...current,
      entries: current.entries.map((entry) => (entry.id === id ? updater(entry) : entry)),
    }));
  }

  function handleAddEntry(type: PaymentInstructionType) {
    const entry = createEntry(type);

    setDraft((current) => ({
      ...current,
      entries: [...current.entries, entry],
    }));

    setExpandedId(entry.id);
  }

  function handleRemoveEntry(id: string) {
    setDraft((current) => {
      const nextEntries = current.entries.filter((entry) => entry.id !== id);

      if (expandedId === id) {
        setExpandedId(nextEntries[0]?.id ?? null);
      }

      return {
        ...current,
        entries: nextEntries,
      };
    });
  }

  function handleSave() {
    const cleaned: PaymentInstructionsDraft = {
      text: draft.text.trim(),
      entries: draft.entries.filter(isEntryMeaningful).map((entry) => {
        switch (entry.type) {
          case "PHONE":
            return {
              ...entry,
              label: entry.label.trim(),
              phoneNumber: entry.phoneNumber.trim(),
            };

          case "UPI_ID":
            return {
              ...entry,
              label: entry.label.trim(),
              upiId: entry.upiId.trim(),
            };

          case "QR_CODE":
            return {
              ...entry,
              label: entry.label.trim(),
              fileUrl: entry.fileUrl?.trim() || "",
              fileName: entry.fileName?.trim() || "",
              mimeType: entry.mimeType?.trim() || "",
              path: entry.path?.trim() || "",
            };

          case "NEFT":
            return {
              ...entry,
              label: entry.label.trim(),
              accountName: entry.accountName.trim(),
              accountNumber: entry.accountNumber.trim(),
              ifscCode: entry.ifscCode.trim().toUpperCase(),
              bankName: entry.bankName.trim(),
              branchName: entry.branchName.trim(),
            };

          default:
            return entry;
        }
      }),
    };

    onSave(cleaned);
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="payment-instructions-backdrop" onClick={onClose}>
      <div
        className="payment-instructions-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-instructions-title"
      >
        <div className="payment-instructions-header">
          <div>
            <h2 id="payment-instructions-title">Payment instructions</h2>
            <p>{entryCountText}</p>
          </div>

          <button
            type="button"
            className="payment-instructions-close"
            onClick={onClose}
            aria-label="Close payment instructions"
          >
            ×
          </button>
        </div>

        <div className="payment-instructions-body">
          <label className="payment-instructions-field payment-instructions-field-full">
            <span>Intro text</span>
            <textarea
              rows={2}
              value={draft.text}
              onChange={(e) =>
                setDraft((current) => ({
                  ...current,
                  text: e.target.value,
                }))
              }
              placeholder="Optional note shown before payment options"
            />
          </label>

          <div className="payment-instructions-add-row">
            <span className="payment-instructions-add-label">Add payment mode</span>

            <div className="payment-instructions-add-actions">
              <button type="button" onClick={() => handleAddEntry("PHONE")}>
                + Phone
              </button>
              <button type="button" onClick={() => handleAddEntry("UPI_ID")}>
                + UPI
              </button>
              <button type="button" onClick={() => handleAddEntry("QR_CODE")}>
                + QR
              </button>
              <button type="button" onClick={() => handleAddEntry("NEFT")}>
                + NEFT
              </button>
            </div>
          </div>

          {draft.entries.length === 0 ? (
            <div className="payment-instructions-empty">
              No payment methods added yet.
            </div>
          ) : (
            <div className="payment-instructions-entry-list">
              {draft.entries.map((entry, index) => {
                const isExpanded = expandedId === entry.id;

                return (
                  <div className="payment-instructions-entry-card" key={entry.id}>
                    <button
                      type="button"
                      className="payment-instructions-entry-head"
                      onClick={() =>
                        setExpandedId((current) => (current === entry.id ? null : entry.id))
                      }
                    >
                      <span className="payment-instructions-entry-head-left">
                        <span className="payment-instructions-entry-index">{index + 1}</span>
                        <span>
                          <strong>{getEntryTitle(entry)}</strong>
                          <small>{getEntrySummary(entry)}</small>
                        </span>
                      </span>

                      <span className="payment-instructions-entry-head-right">
                        <span className="payment-instructions-entry-toggle">
                          {isExpanded ? "−" : "+"}
                        </span>
                      </span>
                    </button>

                    {isExpanded ? (
                      <div className="payment-instructions-entry-body">
                        <div className="payment-instructions-grid">
                          <label className="payment-instructions-field payment-instructions-field-full">
                            <span>Label</span>
                            <input
                              value={entry.label}
                              onChange={(e) =>
                                updateEntry(entry.id, (current) => ({
                                  ...current,
                                  label: e.target.value,
                                }))
                              }
                              placeholder="Optional label"
                            />
                          </label>

                          {entry.type === "PHONE" ? (
                            <label className="payment-instructions-field payment-instructions-field-full">
                              <span>Phone number</span>
                              <input
                                value={entry.phoneNumber}
                                onChange={(e) =>
                                  updateEntry(entry.id, (current) =>
                                    current.type === "PHONE"
                                      ? { ...current, phoneNumber: e.target.value }
                                      : current
                                  )
                                }
                                placeholder="Enter phone number"
                              />
                            </label>
                          ) : null}

                          {entry.type === "UPI_ID" ? (
                            <label className="payment-instructions-field payment-instructions-field-full">
                              <span>UPI ID</span>
                              <input
                                value={entry.upiId}
                                onChange={(e) =>
                                  updateEntry(entry.id, (current) =>
                                    current.type === "UPI_ID"
                                      ? { ...current, upiId: e.target.value }
                                      : current
                                  )
                                }
                                placeholder="name@bank"
                              />
                            </label>
                          ) : null}

                          {entry.type === "QR_CODE" ? (
                            <>
                              <div className="payment-instructions-field payment-instructions-field-full">
                                <span>Upload QR code</span>
                                <FileUploader
                                  userId={userId}
                                  bucket={MEDIA_BUCKET}
                                  folder="payment-instructions"
                                  filenameBase={`qr_${entry.id}`}
                                  accept="image/*"
                                  label="Choose QR image"
                                  help="Upload a QR code image"
                                  strategy="unique"
                                  onComplete={(files) => {
                                    const file = files[0];
                                    if (!file) return;

                                    updateEntry(entry.id, (current) =>
                                      current.type === "QR_CODE"
                                        ? {
                                            ...current,
                                            fileUrl: file.publicUrl,
                                            fileName: file.fileName,
                                            mimeType: file.mimeType,
                                            sizeBytes: file.size,
                                            path: file.path,
                                            file: null,
                                          }
                                        : current
                                    );
                                  }}
                                />
                              </div>

                              {entry.fileUrl ? (
                                <div className="payment-instructions-qr-preview payment-instructions-field-full">
                                  <img src={entry.fileUrl} alt="QR code" />
                                </div>
                              ) : null}
                            </>
                          ) : null}

                          {entry.type === "NEFT" ? (
                            <>
                              <label className="payment-instructions-field">
                                <span>Account name</span>
                                <input
                                  value={entry.accountName}
                                  onChange={(e) =>
                                    updateEntry(entry.id, (current) =>
                                      current.type === "NEFT"
                                        ? { ...current, accountName: e.target.value }
                                        : current
                                    )
                                  }
                                />
                              </label>

                              <label className="payment-instructions-field">
                                <span>Account number</span>
                                <input
                                  value={entry.accountNumber}
                                  onChange={(e) =>
                                    updateEntry(entry.id, (current) =>
                                      current.type === "NEFT"
                                        ? { ...current, accountNumber: e.target.value }
                                        : current
                                    )
                                  }
                                />
                              </label>

                              <label className="payment-instructions-field">
                                <span>IFSC code</span>
                                <input
                                  value={entry.ifscCode}
                                  onChange={(e) =>
                                    updateEntry(entry.id, (current) =>
                                      current.type === "NEFT"
                                        ? { ...current, ifscCode: e.target.value.toUpperCase() }
                                        : current
                                    )
                                  }
                                />
                              </label>

                              <label className="payment-instructions-field">
                                <span>Bank name</span>
                                <input
                                  value={entry.bankName}
                                  onChange={(e) =>
                                    updateEntry(entry.id, (current) =>
                                      current.type === "NEFT"
                                        ? { ...current, bankName: e.target.value }
                                        : current
                                    )
                                  }
                                />
                              </label>

                              <label className="payment-instructions-field payment-instructions-field-full">
                                <span>Branch name</span>
                                <input
                                  value={entry.branchName}
                                  onChange={(e) =>
                                    updateEntry(entry.id, (current) =>
                                      current.type === "NEFT"
                                        ? { ...current, branchName: e.target.value }
                                        : current
                                    )
                                  }
                                />
                              </label>
                            </>
                          ) : null}
                        </div>

                        <div className="payment-instructions-entry-actions">
                          <button
                            type="button"
                            className="payment-instructions-remove-btn"
                            onClick={() => handleRemoveEntry(entry.id)}
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
        </div>

        <div className="payment-instructions-footer">
          <button
            type="button"
            className="payment-instructions-secondary-btn"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            type="button"
            className="payment-instructions-primary-btn"
            onClick={handleSave}
          >
            Save payment instructions
          </button>
        </div>
      </div>
    </div>
  );
}