// src/utils/walletDefaults.ts
import { PointsAccrualPolicyDTO, WalletUsagePolicyDTO } from "../types/wallet";

export const defaultAccrual = (businessId: string): PointsAccrualPolicyDTO => ({
  businessId,
  pointsPerCampaignReferral: 0,
  pointsPerCampaignReferralAcceptance: 0,
  percentOfCampaignReferralProspectPurchase: 0,
  minProspectPurchaseValue: 0,
  maxPointsPerProspectPurchase: 0,
  maxPointsPerReferrer: 0,
  isActive: false, // backend creates inactive default; mirrors that
});

export const defaultUsage = (businessId: string): WalletUsagePolicyDTO => ({
  businessId,
  allowRedemption: true,
  allowEncashment: false,
  allowTransfer: false,
  encashRate: null,
  minEncashPoints: null,
  minRedemptionPoints: null,
});
