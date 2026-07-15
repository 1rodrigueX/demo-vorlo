import "server-only";
import twilio from "twilio";

export function verifyTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>,
  authToken: string,
) {
  if (!signature) return false;

  return twilio.validateRequest(authToken, signature, url, params);
}
