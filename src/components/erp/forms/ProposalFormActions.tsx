"use client";

import { Save, FileText, Send, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Botões da tela Nova Proposta: Salvar rascunho, Gerar PDF, Enviar, Cancelar. */
export function ProposalFormActions({
  onSaveDraft,
  onGeneratePdf,
  onSend,
  onCancel,
  isSubmitting,
}: {
  onSaveDraft: () => void;
  onGeneratePdf: () => void;
  onSend: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="ghost" onClick={onCancel}>
        <X size={16} />
        Cancelar
      </Button>
      <Button type="button" variant="secondary" onClick={onGeneratePdf}>
        <FileText size={16} />
        Gerar PDF
      </Button>
      <Button type="button" variant="secondary" onClick={onSaveDraft} isLoading={isSubmitting}>
        <Save size={16} />
        Salvar rascunho
      </Button>
      <Button type="button" onClick={onSend} isLoading={isSubmitting}>
        <Send size={16} />
        Enviar
      </Button>
    </div>
  );
}
