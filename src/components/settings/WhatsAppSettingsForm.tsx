"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { updateWhatsAppConnection, type ActionState } from "@/lib/actions/whatsapp-settings";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { WhatsAppConnectionPanel } from "@/components/settings/WhatsAppConnectionPanel";
import type { WhatsAppConnection } from "@/types/domain";

export function WhatsAppSettingsForm({
  connection,
  tenantId,
  siteUrl,
}: {
  connection: WhatsAppConnection;
  tenantId: string;
  siteUrl: string;
}) {
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    updateWhatsAppConnection,
    null,
  );
  const [provider, setProvider] = useState(connection.provider);
  const wasPending = useRef(false);
  const webhookUrl = `${siteUrl}/api/whatsapp/webhook/${tenantId}`;

  useEffect(() => {
    if (wasPending.current && !isPending && !state?.error) {
      toast.success("Conexão de WhatsApp salva");
    }
    wasPending.current = isPending;
  }, [isPending, state]);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <div>
          <Label htmlFor="provider">Provedor</Label>
          <Select
            id="provider"
            name="provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value as "baileys" | "twilio")}
          >
            <option value="baileys">QR code (número pessoal)</option>
            <option value="twilio">Twilio (número oficial)</option>
          </Select>
        </div>

        {provider === "twilio" && (
          <div className="space-y-4 border-l-2 border-gray-100 pl-4">
            <div>
              <Label htmlFor="twilioAccountSid">Account SID</Label>
              <Input
                id="twilioAccountSid"
                name="twilioAccountSid"
                required
                defaultValue={connection.twilio_account_sid ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="twilioAuthToken">Auth Token</Label>
              <Input
                id="twilioAuthToken"
                name="twilioAuthToken"
                type="password"
                required
                defaultValue={connection.twilio_auth_token ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="twilioWhatsappNumber">Número do WhatsApp</Label>
              <Input
                id="twilioWhatsappNumber"
                name="twilioWhatsappNumber"
                placeholder="whatsapp:+14155238886"
                required
                defaultValue={connection.twilio_whatsapp_number ?? ""}
              />
            </div>
            <div>
              <Label>URL do webhook (configurar no console do Twilio)</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={webhookUrl} className="bg-gray-50 text-gray-600" />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    toast.success("URL copiada");
                  }}
                >
                  <Copy size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <Button type="submit" isLoading={isPending}>
          Salvar
        </Button>
      </form>

      {provider === "baileys" && connection.provider === "baileys" && (
        <div className="border-t border-gray-100 pt-4">
          <WhatsAppConnectionPanel />
        </div>
      )}
    </div>
  );
}
