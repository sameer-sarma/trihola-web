export type TierLimitsDTO = {
  code: string;
  name: string;
  description?: string | null;
  maxBroadcastGroupMembers: number;
  maxRecipientsPerBroadcast: number;
  maxDeliveriesPerBroadcast: number;
  maxBroadcastsPerDay?: number | null;
  maxDeliveriesPerMonth?: number | null;
};

export type EntityTierDTO = {
  participantType: "USER" | "BUSINESS";
  participantId: string;
  tier: TierLimitsDTO;
};

export type MyTierContextDTO = {
  user: EntityTierDTO;
  businesses: EntityTierDTO[];
};