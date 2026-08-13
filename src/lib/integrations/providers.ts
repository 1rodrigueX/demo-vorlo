import "server-only";

export const OAUTH_PROVIDER_KEYS = ["gmail", "outlook"] as const;
export type OAuthProviderKey = (typeof OAUTH_PROVIDER_KEYS)[number];

export function isOAuthProviderKey(value: string): value is OAuthProviderKey {
  return (OAUTH_PROVIDER_KEYS as readonly string[]).includes(value);
}

export type OAuthProviderConfig = {
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  clientId?: string;
  clientSecret?: string;
  extraAuthorizeParams?: Record<string, string>;
};

/**
 * App OAuth único da plataforma (não por tenant, ao contrário do Bling) —
 * cada cliente só faz "login com a conta" Google/Microsoft dele; quem
 * cadastra o app é a própria Vorlo, uma vez só.
 */
export function getOAuthProviderConfig(provider: OAuthProviderKey): OAuthProviderConfig {
  switch (provider) {
    case "gmail":
      return {
        label: "Gmail",
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scope: [
          "openid",
          "email",
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.send",
        ].join(" "),
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        // access_type+prompt garantem um refresh_token mesmo em reconexões.
        extraAuthorizeParams: { access_type: "offline", prompt: "consent" },
      };
    case "outlook":
      return {
        label: "Outlook",
        authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        scope: ["openid", "email", "offline_access", "Mail.Read", "Mail.Send"].join(" "),
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      };
  }
}
