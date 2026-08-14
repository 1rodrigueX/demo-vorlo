"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { updateFalaAiAsDev } from "@/lib/actions/dev-ai-agents";
import type { AiAgent } from "@/types/domain";

function EditFalaAiForm({
  tenantId,
  agent,
  onSaved,
}: {
  tenantId: string;
  agent: AiAgent;
  onSaved: () => void;
}) {
  const [name, setName] = useState(agent.name);
  const [objective, setObjective] = useState(agent.objective);
  const [systemPrompt, setSystemPrompt] = useState(agent.system_prompt);
  const [temperature, setTemperature] = useState(agent.temperature);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateFalaAiAsDev(tenantId, agent.id, {
        name,
        objective: objective.trim() || undefined,
        systemPrompt: systemPrompt.trim() || undefined,
        temperature,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      toast.success("Vorlo atualizado");
      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="fala-name">Nome</Label>
        <Input id="fala-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="fala-objective">Objetivo</Label>
        <Textarea id="fala-objective" rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="fala-prompt">Personalidade / instruções (prompt)</Label>
        <Textarea id="fala-prompt" rows={8} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="fala-temp">Criatividade ({temperature.toFixed(1)})</Label>
        <input
          id="fala-temp"
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          className="w-full"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" isLoading={isPending} className="w-full">
        Salvar
      </Button>
    </form>
  );
}

/**
 * Único lugar que edita o Vorlo de um tenant — a tela de Agentes de IA do
 * próprio cliente não mostra o Vorlo de propósito (ver comentário em
 * listAgents, src/lib/actions/ai-agents.ts). `agent` vem null só se o tenant
 * ainda não tem CRM de verdade (Vorlo é criado automaticamente junto com o
 * tenant — não deveria faltar, mas cobre o caso defensivamente).
 */
export function EditFalaAiButton({ tenantId, agent }: { tenantId: string; agent: AiAgent | null }) {
  const [open, setOpen] = useState(false);
  if (!agent) return null;

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Sparkles size={14} />
        Vorlo
      </Button>
      {open && (
        <Modal open={open} onClose={() => setOpen(false)} title={`Vorlo — ${agent.name}`} className="max-w-lg">
          <EditFalaAiForm tenantId={tenantId} agent={agent} onSaved={() => setOpen(false)} />
        </Modal>
      )}
    </>
  );
}
