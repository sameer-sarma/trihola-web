// src/types/paymentInstruction.ts

export type PaymentInstructionType =
  | "PHONE"
  | "UPI_ID"
  | "QR_CODE"
  | "NEFT";

export type PaymentInstructionEntry =
  | {
      id: string;
      type: "PHONE";
      label?: string | null;
      phoneNumber: string;
    }
  | {
      id: string;
      type: "UPI_ID";
      label?: string | null;
      upiId: string;
    }
  | {
      id: string;
      type: "QR_CODE";
      label?: string | null;
      fileUrl: string;
      fileName?: string | null;
      mimeType?: string | null;
      sizeBytes?: number | null;
      path?: string | null;
    }
  | {
      id: string;
      type: "NEFT";
      label?: string | null;
      accountName?: string | null;
      accountNumber: string;
      ifscCode: string;
      bankName?: string | null;
      branchName?: string | null;
    };

export type PaymentInstructionsJson = {
  version: 1;
  text?: string | null;
  entries: PaymentInstructionEntry[];
};

export type PaymentInstructionDraftEntry =
  | {
      id: string;
      type: "PHONE";
      label: string;
      phoneNumber: string;
    }
  | {
      id: string;
      type: "UPI_ID";
      label: string;
      upiId: string;
    }
  | {
      id: string;
      type: "QR_CODE";
      label: string;
      fileUrl?: string | null;
      fileName?: string | null;
      mimeType?: string | null;
      sizeBytes?: number | null;
      path?: string | null;
      file?: File | null;
    }
  | {
      id: string;
      type: "NEFT";
      label: string;
      accountName: string;
      accountNumber: string;
      ifscCode: string;
      bankName: string;
      branchName: string;
    };

export type PaymentInstructionsDraft = {
  text: string;
  entries: PaymentInstructionDraftEntry[];
};

export function makePaymentInstructionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `payment-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createEmptyPaymentInstructionsDraft(): PaymentInstructionsDraft {
  return {
    text: "",
    entries: [],
  };
}

export function serializePaymentInstructions(
  value: PaymentInstructionsJson | null | undefined
): string | null {
  if (!value) return null;

  const text = value.text?.trim() || null;
  const entries = Array.isArray(value.entries) ? value.entries : [];

  if (!text && entries.length === 0) return null;

  return JSON.stringify({
    version: 1 as const,
    text,
    entries,
  });
}

export function parsePaymentInstructionsJson(
  raw: string | null | undefined
): PaymentInstructionsJson | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (parsed?.version !== 1) return null;
    if (!Array.isArray(parsed?.entries)) return null;

    return {
      version: 1,
      text: typeof parsed.text === "string" ? parsed.text : null,
      entries: parsed.entries,
    };
  } catch {
    return null;
  }
}

export function draftFromPaymentInstructionsJson(
  json: PaymentInstructionsJson | null | undefined
): PaymentInstructionsDraft {
  if (!json) {
    return createEmptyPaymentInstructionsDraft();
  }

  return {
    text: json.text ?? "",
    entries: json.entries.map((entry) => {
      switch (entry.type) {
        case "PHONE":
          return {
            id: entry.id || makePaymentInstructionId(),
            type: "PHONE",
            label: entry.label ?? "",
            phoneNumber: entry.phoneNumber ?? "",
          };

        case "UPI_ID":
          return {
            id: entry.id || makePaymentInstructionId(),
            type: "UPI_ID",
            label: entry.label ?? "",
            upiId: entry.upiId ?? "",
          };

        case "QR_CODE":
          return {
            id: entry.id || makePaymentInstructionId(),
            type: "QR_CODE",
            label: entry.label ?? "",
            fileUrl: entry.fileUrl ?? null,
            fileName: entry.fileName ?? null,
            mimeType: entry.mimeType ?? null,
            sizeBytes: entry.sizeBytes ?? null,
            path: entry.path ?? null,
            file: null, // 🔥 important: no local file in edit mode
          };

        case "NEFT":
          return {
            id: entry.id || makePaymentInstructionId(),
            type: "NEFT",
            label: entry.label ?? "",
            accountName: entry.accountName ?? "",
            accountNumber: entry.accountNumber ?? "",
            ifscCode: entry.ifscCode ?? "",
            bankName: entry.bankName ?? "",
            branchName: entry.branchName ?? "",
          };

        default:
          return null;
      }
    }).filter(Boolean) as PaymentInstructionDraftEntry[],
  };
}


export function paymentInstructionsJsonFromDraft(
  draft: PaymentInstructionsDraft
): PaymentInstructionsJson | null {
  const entries: PaymentInstructionEntry[] = draft.entries
    .map((entry) => {
      switch (entry.type) {
        case "PHONE":
          if (!entry.phoneNumber.trim()) return null;
          return {
            id: entry.id,
            type: "PHONE",
            label: entry.label?.trim() || null,
            phoneNumber: entry.phoneNumber.trim(),
          };

        case "UPI_ID":
          if (!entry.upiId.trim()) return null;
          return {
            id: entry.id,
            type: "UPI_ID",
            label: entry.label?.trim() || null,
            upiId: entry.upiId.trim(),
          };

        case "QR_CODE":
          if (!entry.fileUrl) return null;
          return {
            id: entry.id,
            type: "QR_CODE",
            label: entry.label?.trim() || null,
            fileUrl: entry.fileUrl,
            fileName: entry.fileName ?? null,
            mimeType: entry.mimeType ?? null,
            sizeBytes: entry.sizeBytes ?? null,
            path: entry.path ?? null,
          };

        case "NEFT":
          if (!entry.accountNumber.trim() || !entry.ifscCode.trim()) return null;
          return {
            id: entry.id,
            type: "NEFT",
            label: entry.label?.trim() || null,
            accountName: entry.accountName?.trim() || null,
            accountNumber: entry.accountNumber.trim(),
            ifscCode: entry.ifscCode.trim(),
            bankName: entry.bankName?.trim() || null,
            branchName: entry.branchName?.trim() || null,
          };

        default:
          return null;
      }
    })
    .filter(Boolean) as PaymentInstructionEntry[];

  const text = draft.text?.trim() || null;

  if (!text && entries.length === 0) {
    return null;
  }

  return {
    version: 1,
    text,
    entries,
  };
}