import { Zap, GitBranch, MessageCircle, Move, UserCheck, Tag, ListPlus, Clock } from "lucide-react";
import type { FlowNodeType, FlowNodeConfig } from "@/lib/automations/flow-types";

// lucide-react 1.24.0 não exporta o tipo `LucideIcon` — a convenção do projeto
// (ver Sidebar.tsx) é tipar ícones como `typeof <um ícone>`.
type LucideIcon = typeof Zap;

// De onde um campo <select> puxa as opções. "static" traz as opções embutidas
// (ex: unidade de tempo); os demais são preenchidos no editor com dados do
// tenant (etapas do funil, membros da equipe, tags).
export type FieldOptionsSource = "stages" | "members" | "tags" | "static";

export type FlowFieldDef = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "number" | "select";
  placeholder?: string;
  min?: number;
  max?: number;
  optionsSource?: FieldOptionsSource;
  staticOptions?: { value: string; label: string }[];
  help?: string;
};

export type FlowNodeDef = {
  kind: string;
  type: FlowNodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Cor do "chip" do ícone no nó/paleta (tokens sólidos, sem neon). */
  accent: string;
  fields: FlowFieldDef[];
};

// ─── Gatilhos (o que INICIA a trajetória) ───────────────────────────────────
const TRIGGERS: FlowNodeDef[] = [
  {
    kind: "lead_created",
    type: "trigger",
    label: "Novo lead",
    description: "Quando um novo lead entra no CRM.",
    icon: Zap,
    accent: "#ff5722",
    fields: [],
  },
  {
    kind: "stage_changed",
    type: "trigger",
    label: "Mudou de etapa",
    description: "Quando o lead entra em uma etapa do funil.",
    icon: GitBranch,
    accent: "#ff5722",
    fields: [
      { key: "stageId", label: "Etapa do funil", kind: "select", optionsSource: "stages" },
    ],
  },
  {
    kind: "message_received",
    type: "trigger",
    label: "Mensagem recebida",
    description: "Quando o lead manda uma mensagem no WhatsApp.",
    icon: MessageCircle,
    accent: "#ff5722",
    fields: [],
  },
];

// ─── Ações (o que a trajetória FAZ) ──────────────────────────────────────────
const ACTIONS: FlowNodeDef[] = [
  {
    kind: "send_whatsapp",
    type: "action",
    label: "Enviar WhatsApp",
    description: "Envia uma mensagem automática pelo WhatsApp.",
    icon: MessageCircle,
    accent: "#22c55e",
    fields: [
      {
        key: "message",
        label: "Mensagem",
        kind: "textarea",
        placeholder: "Olá {nome}! Tudo bem?",
        help: "Use {nome} para inserir o primeiro nome do lead.",
      },
    ],
  },
  {
    kind: "move_stage",
    type: "action",
    label: "Mover no funil",
    description: "Move o lead para outra etapa do funil.",
    icon: Move,
    accent: "#6366f1",
    fields: [{ key: "stageId", label: "Mover para", kind: "select", optionsSource: "stages" }],
  },
  {
    kind: "assign_user",
    type: "action",
    label: "Atribuir responsável",
    description: "Define quem cuida desse lead.",
    icon: UserCheck,
    accent: "#0ea5e9",
    fields: [{ key: "userId", label: "Responsável", kind: "select", optionsSource: "members" }],
  },
  {
    kind: "add_tag",
    type: "action",
    label: "Adicionar tag",
    description: "Marca o lead com uma tag.",
    icon: Tag,
    accent: "#a855f7",
    fields: [
      {
        key: "tagName",
        label: "Tag",
        kind: "text",
        placeholder: "Ex: Lead quente",
        help: "Se a tag não existir, ela é criada.",
      },
    ],
  },
  {
    kind: "create_task",
    type: "action",
    label: "Criar tarefa",
    description: "Gera uma tarefa para a equipe.",
    icon: ListPlus,
    accent: "#f59e0b",
    fields: [{ key: "title", label: "Título da tarefa", kind: "text", placeholder: "Ligar para o lead" }],
  },
  {
    kind: "wait",
    type: "action",
    label: "Esperar",
    description: "Aguarda um tempo antes do próximo passo.",
    icon: Clock,
    accent: "#64748b",
    fields: [
      { key: "amount", label: "Quantidade", kind: "number", min: 1, max: 720 },
      {
        key: "unit",
        label: "Unidade",
        kind: "select",
        optionsSource: "static",
        staticOptions: [
          { value: "minutes", label: "Minutos" },
          { value: "hours", label: "Horas" },
          { value: "days", label: "Dias" },
        ],
      },
    ],
  },
];

export const FLOW_CATALOG: FlowNodeDef[] = [...TRIGGERS, ...ACTIONS];

const BY_KIND = new Map(FLOW_CATALOG.map((d) => [d.kind, d]));

export function getNodeDef(kind: string): FlowNodeDef | undefined {
  return BY_KIND.get(kind);
}

/** Config inicial de um nó recém-criado, a partir dos campos do catálogo. */
export function defaultConfigFor(def: FlowNodeDef): FlowNodeConfig {
  const config: FlowNodeConfig = {};
  for (const f of def.fields) {
    if (f.kind === "number") config[f.key] = f.min ?? 1;
    else if (f.kind === "select" && f.optionsSource === "static") config[f.key] = f.staticOptions?.[0]?.value ?? "";
    else config[f.key] = "";
  }
  return config;
}
