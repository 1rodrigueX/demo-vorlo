import "server-only";
import twilio from "twilio";

export function verifyTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>,
) {
  if (!signature) return false;

  return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, url, params);
}
