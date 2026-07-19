export const RESERVED_SLUGS = new Set([
  "api",
  "login",
  "signup",
  "auth",
  "compra",
  "dev",
  "choose-plan",
  "billing-pendente",
  "reset-password",
  "_next",
  "favicon.ico",
  "public",
  "app",
  "app-web",
  "central",
  "comprar-transportadora",
  "downloads",
  "mfa-challenge",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
