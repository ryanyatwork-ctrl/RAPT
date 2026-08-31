export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",

  // Server-to-server RAPT pricing consumers (GetawayCDA/GetawayNWA).
  // Production public pricing endpoints fail closed if this key is not set.
  publicPricingApiKey: process.env.RAPT_PUBLIC_API_KEY ?? "",

  // OwnerRez is disabled by default. Enabling it requires an explicit account,
  // token, and RAPT-property -> OwnerRez-property mapping.
  ownerRezEnabled: process.env.OWNERREZ_ENABLED === "true",
  ownerRezEmail: process.env.OWNERREZ_EMAIL ?? "",
  ownerRezToken: process.env.OWNERREZ_TOKEN ?? "",
  ownerRezBaseUrl: process.env.OWNERREZ_BASE_URL ?? "https://api.ownerrez.com",
  ownerRezPropertyMapJson: process.env.OWNERREZ_PROPERTY_MAP_JSON ?? "{}",
};
