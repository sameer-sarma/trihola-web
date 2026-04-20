export type EcomPlatform = "SHOPIFY" | "WOOCOMMERCE" | "CUSTOM";

export interface EcomIntegrationRequest {
  integrationId?: string;       // for updates
  businessId: string;
  platform: EcomPlatform;
  domain: string;               // e.g. store.mybrand.com
  publicKey: string;
  secret?: string | null;       // write-only (server never returns)
  isActive: boolean;
}

export interface EcomIntegrationResponse {
  id: string;
  businessId: string;
  platform: EcomPlatform;
  domain: string;
  publicKey: string;
  hasSecret: boolean;           // server-side flag indicating a stored secret exists
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
