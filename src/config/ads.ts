export type AdProvider = "adsense" | "custom" | "both";

export interface CustomAdCampaign {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  targetUrl: string;
  altText: string;
}

export interface AdConfig {
  provider: AdProvider;
  adsenseClientId?: string;
  customCampaigns: CustomAdCampaign[];
}

export const activeAdConfig: AdConfig = {
  // Can be "adsense", "custom", or "both"
  // If "both", it will attempt to render Google AdSense, and if it fails or isn't configured,
  // it will render a custom sponsor banner campaign.
  provider: (process.env.NEXT_PUBLIC_AD_PROVIDER as AdProvider) || "both",
  adsenseClientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
  
  // Custom sponsor/house campaigns that rotate when "custom" or "both" (fallback) is active
  customCampaigns: [
    {
      id: "supershop-premium",
      title: "Upgrade to SuperShop Premium",
      subtitle: "Unlock Advanced Analytics & Unlimited Multi-Tenant Shops",
      imageUrl: "/supershop_premium_banner.png",
      targetUrl: "/profile?tab=billing",
      altText: "Upgrade to SuperShop Premium today for advanced retail management features.",
    }
  ]
};

// Map of standard AdSense Slot IDs for different parts of the application.
// In production, the user will replace these placeholder strings with actual AdSense slot IDs.
export const AD_SLOTS = {
  posFooter: process.env.NEXT_PUBLIC_ADSENSE_SLOT_POS_FOOTER || "8329487192",
  inventoryFooter: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INVENTORY_FOOTER || "1298471928",
  loginBanner: process.env.NEXT_PUBLIC_ADSENSE_SLOT_LOGIN || "9182374981",
  globalDashboardFooter: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD_FOOTER || "3829471982"
};
