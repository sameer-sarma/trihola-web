// src/types/wallet.ts
export type PointsAccrualPolicyDTO = {
  businessId: string;
  pointsPerCampaignReferral: number | null;
  pointsPerCampaignReferralAcceptance: number | null;
  percentOfCampaignReferralProspectPurchase: number | null;
  minProspectPurchaseValue: number | null;
  maxPointsPerProspectPurchase: number | null;
  maxPointsPerReferrer: number | null;
  isActive: boolean;
};

export type WalletUsagePolicyDTO = {
  businessId: string;
  allowRedemption: boolean;
  allowEncashment: boolean;
  allowTransfer: boolean;
  encashRate: number | null;
  minEncashPoints: number | null;
  minRedemptionPoints: number | null;
};
