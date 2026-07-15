"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { disconnectOAuthIntegration } from "@/lib/actions/tenant-integrations";

type ProviderRow = { provider: "gmail" | "outlook"; label: string; connectedEmail: string | null };

function ProviderRowItem({ provider, label, connectedEmail }: ProviderRow) {
  const [isDisconnecting, startDisconnect] = useTransition();
  const router = useRouter();

  function handleDisconnect() {
    startDisconnect(async () => {
      const result = await disconnectOAuthIntegration(provider);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {connectedEmail && (
          <p className="flex items-center gap-1 text-xs text-emerald-700">
            <CheckCircle2 size={12} /> Conectado como {connectedEmail}
          </p>
        )}
      </div>
      {connectedEmail ? (
        <Button type="button" variant="secondary" size="sm" isLoading={isDisconnecting} onClick={handleDisconnect}>
          Desconectar
        </Button>
      ) : (
        <a href={`/api/integrations/${provider}/authorize`}>
          <Button type="button" size="sm">
            <ExternalLink size={14} />
            Conectar
          </Button>
        </a>
      )}
    </div>
  );
}

export function EmailIntegrationsCard({
  gmailEmail,
  outlookEmail,
}: {
  gmailEmail: string | null;
  outlookEmail: string | null;
}) {
  return (
    <div className="divide-y divide-gray-100">
      <ProviderRowItem provider="gmail" label="Gmail" connectedEmail={gmailEmail} />
      <ProviderRowItem provider="outlook" label="Outlook" connectedEmail={outlookEmail} />
    </div>
  );
}
