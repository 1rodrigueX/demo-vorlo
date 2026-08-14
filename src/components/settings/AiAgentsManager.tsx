"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Bot, Plus, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDeleteButton } from "@/components/ui/ConfirmDeleteButton";
import { createAgent, updateAgent, toggleAgentStatus, deleteAgent } from "@/lib/actions/ai-agents";
import { ALL_TOOL_KEYS, AGENT_TEMPLATES, CREATABLE_AGENT_TYPES } from "@/lib/ai-agents/templates";
import type { AiAgent, AgentType } from "@/types/domain";

const TYPE_LABEL: Record<AgentType, string> = {
  fala_ai: "Vorlo",
  sdr: "SDR",
  atendente: "Atendente",
  financeiro: "Financeiro",
  cobranca: "Cobrança",
  juridico: "Jurídico",
  custom: "Personalizado",
};

const TOOL_LABEL: Record<(typeof ALL_TOOL_KEYS)[number], string> = {
  search_contacts: "Buscar contatos",
  list_open_deals: "Listar negócios abertos",
  set_deal_budget: "Definir orçamento do negócio",
  mark_proposal_sent: "Marcar proposta como enviada",
  mark_deal_won: "Marcar negócio como ganho",
  register_contact_in_bling: "Cadastrar contato no Bling",
  remember_fact: "Lembrar informações (memória)",
};

type ToolKey = (typeof ALL_TOOL_KEYS)[number];

type FormValues = {
  name: string;
  type: (typeof CREATABLE_AGENT_TYPES)[number];
  objective: string;
  systemPrompt: string;
  tools: ToolKey[];
  temperature: number;
};

function valuesFromAgent(agent: AiAgent | null): FormValues {
  if (!agent) {
    const template = AGENT_TEMPLATES.sdr;
    return {
      name: "",
      type: "sdr",
      objective: "",
      systemPrompt: "",
      tools: [...template.tools] as ToolKey[],
      temperature: template.temperature,
    };
  }
  return {
    name: agent.name,
    type: (agent.type === "fala_ai" ? "custom" : agent.type) as FormValues["type"],
    objective: agent.objective,
    systemPrompt: agent.system_prompt,
    // Filtra as ferramentas exclusivas do Vorlo (create_agent, list_agents...)
    // — não fazem sentido como checkbox editável aqui, mesmo pro próprio Vorlo.
    tools: agent.tools.filter((t): t is ToolKey => (ALL_TOOL_KEYS as readonly string[]).includes(t)),
    temperature: agent.temperature,
  };
}

function AgentFormModal({
  open,
  onClose,
  editing,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  editing: AiAgent | null;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<FormValues>(() => valuesFromAgent(editing));
  const [showAdvanced, setShowAdvanced] = useState(!!editing);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleTool(tool: ToolKey) {
    setValues((v) => ({ ...v, tools: v.tools.includes(tool) ? v.tools.filter((t) => t !== tool) : [...v.tools, tool] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const advancedFilled = showAdvanced && values.objective.trim() && values.systemPrompt.trim();
      const result = editing
        ? await updateAgent(editing.id, {
            name: values.name,
            objective: values.objective.trim() || undefined,
            systemPrompt: values.systemPrompt.trim() || undefined,
            tools: values.tools,
            temperature: values.temperature,
          })
        : await createAgent({
            name: values.name,
            type: values.type,
            // Sem preencher o avançado, o servidor completa com o template do
            // tipo escolhido — é o que deixa "criar o SDR" ser só nome + tipo.
            objective: advancedFilled ? values.objective.trim() : undefined,
            systemPrompt: advancedFilled ? values.systemPrompt.trim() : undefined,
            tools: showAdvanced ? values.tools : undefined,
            temperature: showAdvanced ? values.temperature : undefined,
          });

      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success(editing ? "Agente atualizado" : "Agente criado");
      onSaved();
    });
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Editar ${editing.name}` : "Novo agente de IA"} className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="agent-name">Nome</Label>
          <Input
            id="agent-name"
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            placeholder="Ex: SDR Nyplastic"
            required
          />
        </div>

        {!editing && (
          <div>
            <Label htmlFor="agent-type">Tipo</Label>
            <Select
              id="agent-type"
              value={values.type}
              onChange={(e) => {
                const type = e.target.value as FormValues["type"];
                const template = type === "custom" ? null : AGENT_TEMPLATES[type];
                setValues((v) => ({
                  ...v,
                  type,
                  objective: template?.objective ?? v.objective,
                  systemPrompt: template?.systemPrompt ?? v.systemPrompt,
                  tools: template ? ([...template.tools] as ToolKey[]) : v.tools,
                  temperature: template?.temperature ?? v.temperature,
                }));
              }}
            >
              {CREATABLE_AGENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-gray-500">
              {values.type === "custom"
                ? "Personalizado: você define objetivo e comportamento do zero."
                : "Já vem com um comportamento pronto — dá pra ajustar tudo abaixo, ou deixar como está e editar depois."}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ChevronDown size={14} className={showAdvanced ? "rotate-180 transition-transform" : "transition-transform"} />
          Personalizar comportamento
        </button>

        {showAdvanced && (
          <div className="space-y-4 rounded-lg border border-gray-200 p-3">
            <div>
              <Label htmlFor="agent-objective">Objetivo</Label>
              <Textarea
                id="agent-objective"
                rows={2}
                value={values.objective}
                onChange={(e) => setValues((v) => ({ ...v, objective: e.target.value }))}
                placeholder="Uma frase sobre o que esse agente deve fazer"
                required={!editing && values.type === "custom"}
              />
            </div>
            <div>
              <Label htmlFor="agent-prompt">Personalidade / instruções (prompt)</Label>
              <Textarea
                id="agent-prompt"
                rows={6}
                value={values.systemPrompt}
                onChange={(e) => setValues((v) => ({ ...v, systemPrompt: e.target.value }))}
                placeholder="Como esse agente deve se comportar, o que pode e não pode fazer..."
                required={!editing && values.type === "custom"}
              />
            </div>
            <div>
              <Label>Ferramentas que ele pode usar</Label>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {ALL_TOOL_KEYS.map((tool) => (
                  <label key={tool} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={values.tools.includes(tool)}
                      onChange={() => toggleTool(tool)}
                    />
                    {TOOL_LABEL[tool]}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="agent-temp">Criatividade ({values.temperature.toFixed(1)})</Label>
              <input
                id="agent-temp"
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={values.temperature}
                onChange={(e) => setValues((v) => ({ ...v, temperature: Number(e.target.value) }))}
                className="w-full"
              />
              <p className="text-xs text-gray-500">Mais baixo = respostas mais previsíveis. Mais alto = mais criativo.</p>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" isLoading={isPending} className="w-full">
          {editing ? "Salvar alterações" : "Criar agente"}
        </Button>
      </form>
    </Modal>
  );
}

function AgentRow({ agent }: { agent: AiAgent }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isToggling, startToggle] = useTransition();

  function handleToggle() {
    startToggle(async () => {
      const result = await toggleAgentStatus(agent.id, agent.status === "active" ? "inactive" : "active");
      if (result.error) toast.error(result.error);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            {agent.is_fala_ai ? <Sparkles size={16} /> : <Bot size={16} />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-gray-900">{agent.name}</p>
              <Badge className="bg-gray-100 text-gray-600">{TYPE_LABEL[agent.type]}</Badge>
            </div>
            <p className="truncate text-xs text-gray-500">{agent.objective}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {agent.is_fala_ai ? (
            <Badge className="bg-emerald-50 text-emerald-700">Sempre ativo</Badge>
          ) : (
            <Button type="button" variant="secondary" size="sm" isLoading={isToggling} onClick={handleToggle}>
              {agent.status === "active" ? "Ativo" : "Inativo"}
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
            Editar
          </Button>
          {!agent.is_fala_ai && (
            <ConfirmDeleteButton
              action={() =>
                deleteAgent(agent.id).then((r) => {
                  if (r.error) toast.error(r.error);
                  else toast.success("Agente excluído");
                })
              }
              confirmMessage={`Excluir o agente "${agent.name}"? Essa ação não pode ser desfeita.`}
            />
          )}
        </div>
      </div>
      {/* Montado só enquanto aberto — cada abertura começa com o estado do form
          limpo (valuesFromAgent roda de novo), sem precisar sincronizar via effect. */}
      {modalOpen && (
        <AgentFormModal open={modalOpen} onClose={() => setModalOpen(false)} editing={agent} onSaved={() => setModalOpen(false)} />
      )}
    </>
  );
}

export function AiAgentsManager({ initialAgents }: { initialAgents: AiAgent[] }) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Agentes de IA</h2>
          <p className="mt-1 text-sm text-gray-500">
            Cada agente é privado desta empresa — configure nome, personalidade e ferramentas do jeito que quiser.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          Novo agente
        </Button>
      </div>

      {!initialAgents.length ? (
        <Card className="flex flex-col items-center gap-2 p-8 text-center text-sm text-gray-500">
          <Bot size={24} className="text-gray-300" />
          Nenhum agente criado ainda.
        </Card>
      ) : (
        <Card className="divide-y divide-gray-100 overflow-hidden">
          {initialAgents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} />
          ))}
        </Card>
      )}

      {createOpen && (
        <AgentFormModal open={createOpen} onClose={() => setCreateOpen(false)} editing={null} onSaved={() => setCreateOpen(false)} />
      )}
    </div>
  );
}
