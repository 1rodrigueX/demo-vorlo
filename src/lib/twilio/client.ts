import "server-only";
import twilio from "twilio";

export function getTwilioClient(accountSid: string, authToken: string) {
  return twilio(accountSid, authToken);
}
