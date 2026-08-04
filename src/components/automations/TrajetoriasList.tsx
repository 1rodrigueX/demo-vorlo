"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Workflow, Plus, Trash2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { createFlow, createFlowWithGraph, deleteFlow } from "@/lib/actions/automation-flows";
import { AIFlowModal } from "@/components/automations/AIFlowModal";
import type { FlowGraph } from "@/lib/automations/flow-types";

export type FlowListItem = {
  id: string;
  name: string;
  status: "draft" | "active";
  updated_at: string;
  nodeCount: number;
};

export function TrajetoriasList({ flows, canEdit }: { flows: FlowListItem[]; canEdit: boolean }) {
  const router = useRouter();
  const tenantSlug = useTenantSlug();
  const [open, setOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  const onAIGenerated = (r: { name: string; graph: FlowGraph }) => {
    startTransition(async () => {
      const res = await createFlowWithGraph(r.name, r.graph);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setAiOpen(false);
      router.push(`/${tenantSlug}/trajetorias/${res.id}`);
    });
  };

  const onCreate = () => {
    startTransition(async () => {
      const res = await createFlow(name);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setOpen(false);
      setName("");
      router.push(`/${tenantSlug}/trajetorias/${res.id}`);
    });
  };

  const onDelete = (id: string, flowName: string) => {
    if (!confirm(`Apagar a trajetória "${flowName}"? Esta ação não pode ser desfeita.`)) return;
    startTransition(async () => {
      const res = await deleteFlow(id);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Trajetória apagada");
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Trajetórias</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Monte automações visuais: um gatilho dispara uma sequência de ações no CRM.
          </p>
        </div>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="secondary" onClick={() => setAiOpen(true)}>
              <Sparkles size={16} />
              Criar com a IA
            </Button>
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} />
              Nova trajetória
            </Button>
          </div>
        )}
      </div>

      {flows.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ff5722]/10 text-[#ff5722]">
            <Workflow size={26} />
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">Nenhuma trajetória ainda</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
              Crie um fluxo estilo n8n para automatizar seu atendimento — como enviar um WhatsApp
              assim que um lead entra, ou mover o lead de etapa sozinho.
            </p>
          </div>
          {canEdit && (
            <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
              <Button onClick={() => setAiOpen(true)}>
                <Sparkles size={16} />
                Criar com a IA
              </Button>
              <Button variant="secondary" onClick={() => setOpen(true)}>
                <Plus size={16} />
                Criar manualmente
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {flows.map((flow) => (
            <Card key={flow.id} className="group relative flex flex-col p-4 transition-shadow hover:shadow-md">
              <Link href={`/${tenantSlug}/trajetorias/${flow.id}`} className="flex flex-1 flex-col">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff5722]/10 text-[#ff5722]">
                    <Workflow size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{flow.name}</p>
                    <p className="text-xs text-gray-400">
                      {flow.nodeCount} {flow.nodeCount === 1 ? "passo" : "passos"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <StatusBadge status={flow.status} />
                  <span className="text-[11px] text-gray-400">
                    Editada em {new Date(flow.updated_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </Link>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onDelete(flow.id, flow.name)}
                  disabled={isPending}
                  className="absolute right-3 top-3 rounded-md p-1.5 text-gray-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  aria-label="Apagar trajetória"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Nova trajetória">
        <div className="space-y-4">
          <div>
            <label htmlFor="flow-name" className="mb-1 block text-sm font-medium text-gray-700">
              Nome
            </label>
            <Input
              id="flow-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Boas-vindas ao novo lead"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) onCreate();
              }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onCreate} isLoading={isPending} disabled={!name.trim()}>
              Criar e abrir
            </Button>
          </div>
        </div>
      </Modal>

      <AIFlowModal open={aiOpen} onClose={() => setAiOpen(false)} onGenerated={onAIGenerated} />
    </div>
  );
}

function StatusBadge({ status }: { status: "draft" | "active" }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Ativa
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Rascunho
    </span>
  );
}
