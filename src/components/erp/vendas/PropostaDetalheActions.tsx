"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PrintButton } from "@/components/erp/documents/PrintButton";
import { updateErpPropostaStatus } from "@/lib/actions/erp-propostas";

/** Botão "Aprovar e enviar" — só aparece pra propostas ainda em rascunho (as
 * que o SDR monta sozinho entram assim, e também as criadas manualmente).
 * É o único ponto do sistema que dispara o envio de verdade por WhatsApp. */
export function PropostaDetalheActions({ propostaId, status, hasPhone }: { propostaId: string; status: string; hasPhone: boolean }) {
  const router = useRouter();
  const [isSending, startSending] = useTransition();

  function handleApproveAndSend() {
    if (!hasPhone) {
      toast.error("Este cliente não tem telefone cadastrado.");
      return;
    }
    if (!window.confirm("Enviar esta proposta pro cliente agora via WhatsApp?")) return;
    startSending(async () => {
      const result = await updateErpPropostaStatus(propostaId, "enviada");
      if (result.error) toast.error(result.error);
      else {
        toast.success("Proposta enviada pro cliente.");
        router.refresh();
      }
    });
  }

  return (
    <div className="erp-print-hide flex flex-wrap items-center gap-2">
      <PrintButton label="Imprimir" />
      {status === "rascunho" && (
        <Button type="button" onClick={handleApproveAndSend} isLoading={isSending}>
          <Send size={16} />
          Aprovar e enviar
        </Button>
      )}
    </div>
  );
}
