"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { generateFlowGraph } from "@/lib/actions/automation-ai";
import type { FlowGraph } from "@/lib/automations/flow-types";

const EXEMPLO =
  'Ex: Quando entrar um lead novo, espere 5 minutos e mande um WhatsApp de boas-vindas. ' +
  'Depois mova para "Qualificado" e crie uma tarefa pro vendedor ligar.';

export function AIFlowModal({
  open,
  onClose,
  onGenerated,
}: {
  open: boolean;
  onClose: () => void;
  onGenerated: (result: { name: string; graph: FlowGraph }) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [pending, startTransition] = useTransition();

  const generate = () => {
    startTransition(async () => {
      const res = await generateFlowGraph(prompt);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      onGenerated(res);
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Criar com a IA">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Descreva em português o que a automação deve fazer. A IA monta a trajetória pra você — criando
          etapas do funil ou tags novas se o seu processo precisar.
        </p>
        <Textarea
          rows={5}
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={EXEMPLO}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && prompt.trim().length >= 3) generate();
          }}
        />
        <div className="flex items-start gap-2 rounded-lg bg-[#ff5722]/[0.06] p-3 text-xs text-gray-600">
          <Sparkles size={15} className="mt-0.5 shrink-0 text-[#ff5722]" />
          <span>Seja específico com etapas, mensagens e prazos. Depois é só revisar no editor e salvar.</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={generate} disabled={pending || prompt.trim().length < 3}>
            <Sparkles size={16} />
            {pending ? "Gerando…" : "Gerar trajetória"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
