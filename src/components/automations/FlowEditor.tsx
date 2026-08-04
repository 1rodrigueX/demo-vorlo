"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { FlowCanvas } from "@/components/automations/FlowCanvas";
import { NodeConfigPanel, type FlowOptions } from "@/components/automations/NodeConfigPanel";
import { FLOW_CATALOG, getNodeDef, defaultConfigFor } from "@/lib/automations/flow-catalog";
import type { FlowNode, FlowEdge, FlowNodeConfig, FlowGraph } from "@/lib/automations/flow-types";
import { saveFlow } from "@/lib/actions/automation-flows";

const UNIT_LABEL: Record<string, string> = { minutes: "min", hours: "h", days: "dias" };

export function FlowEditor({
  flowId,
  initialName,
  initialStatus,
  initialGraph,
  options,
  canEdit,
}: {
  flowId: string;
  initialName: string;
  initialStatus: "draft" | "active";
  initialGraph: FlowGraph;
  options: FlowOptions;
  canEdit: boolean;
}) {
  const tenantSlug = useTenantSlug();
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<"draft" | "active">(initialStatus);
  const [nodes, setNodes] = useState<FlowNode[]>(initialGraph.nodes);
  const [edges, setEdges] = useState<FlowEdge[]>(initialGraph.edges);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isSaving, startSave] = useTransition();

  const stageName = useMemo(() => new Map(options.stages.map((s) => [s.id, s.name])), [options.stages]);
  const memberName = useMemo(() => new Map(options.members.map((m) => [m.id, m.name])), [options.members]);

  const nodeSummary = useCallback(
    (node: FlowNode): string => {
      const c = node.config;
      switch (node.kind) {
        case "send_whatsapp":
          return typeof c.message === "string" && c.message.trim() ? c.message : "Defina a mensagem…";
        case "move_stage":
          return c.stageId ? (stageName.get(String(c.stageId)) ?? "Etapa removida") : "Escolha a etapa…";
        case "stage_changed":
          return c.stageId ? (stageName.get(String(c.stageId)) ?? "Etapa removida") : "Qualquer etapa";
        case "assign_user":
          return c.userId ? (memberName.get(String(c.userId)) ?? "Membro removido") : "Escolha o responsável…";
        case "add_tag":
          return typeof c.tagName === "string" && c.tagName.trim() ? c.tagName : "Defina a tag…";
        case "create_task":
          return typeof c.title === "string" && c.title.trim() ? c.title : "Defina o título…";
        case "wait":
          return `${c.amount ?? 1} ${UNIT_LABEL[String(c.unit)] ?? ""}`.trim();
        default:
          return getNodeDef(node.kind)?.description ?? "";
      }
    },
    [stageName, memberName],
  );

  const markDirty = () => setDirty(true);

  const addNode = (kind: string) => {
    const def = getNodeDef(kind);
    if (!def) return;
    const n = nodes.length;
    const node: FlowNode = {
      id: crypto.randomUUID(),
      type: def.type,
      kind,
      x: 80 + (n % 5) * 44,
      y: 90 + (n % 5) * 66,
      config: defaultConfigFor(def),
    };
    setNodes((prev) => [...prev, node]);
    setSelectedId(node.id);
    markDirty();
  };

  const moveNode = useCallback((id: string, x: number, y: number) => {
    setNodes((prev) => prev.map((nd) => (nd.id === id ? { ...nd, x, y } : nd)));
    setDirty(true);
  }, []);

  const connect = useCallback(
    (source: string, target: string) => {
      setEdges((prev) => {
        if (prev.some((e) => e.source === source && e.target === target)) return prev;
        return [...prev, { id: crypto.randomUUID(), source, target }];
      });
      setDirty(true);
    },
    [],
  );

  const deleteEdge = useCallback((id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
    setDirty(true);
  }, []);

  const updateConfig = (config: FlowNodeConfig) => {
    setNodes((prev) => prev.map((nd) => (nd.id === selectedId ? { ...nd, config } : nd)));
    setDirty(true);
  };

  const deleteNode = () => {
    if (!selectedId) return;
    setNodes((prev) => prev.filter((nd) => nd.id !== selectedId));
    setEdges((prev) => prev.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setSelectedId(null);
    setDirty(true);
  };

  const onSave = () => {
    startSave(async () => {
      const graph: FlowGraph = { nodes, edges };
      const res = await saveFlow({ id: flowId, name: name.trim() || "Sem nome", status, graph });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setDirty(false);
      toast.success("Trajetória salva");
    });
  };

  const selectedNode = nodes.find((nd) => nd.id === selectedId) ?? null;
  const triggers = FLOW_CATALOG.filter((d) => d.type === "trigger");
  const actions = FLOW_CATALOG.filter((d) => d.type === "action");

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-panel px-3 py-2.5">
        <Link
          href={`/${tenantSlug}/trajetorias`}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="Voltar"
        >
          <ArrowLeft size={18} />
        </Link>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            markDirty();
          }}
          disabled={!canEdit}
          className="min-w-0 flex-1 rounded-lg border border-transparent px-2 py-1.5 text-sm font-semibold text-gray-900 hover:border-gray-200 focus:border-gray-300 focus:outline-none"
          placeholder="Nome da trajetória"
        />
        <label className="flex items-center gap-2 text-xs text-gray-500">
          <span>Status</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as "draft" | "active");
              markDirty();
            }}
            disabled={!canEdit}
            className="rounded-md border border-gray-300 bg-panel px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="draft">Rascunho</option>
            <option value="active">Ativa</option>
          </select>
        </label>
        {canEdit && (
          <Button size="sm" onClick={onSave} isLoading={isSaving} className={dirty ? "" : "opacity-90"}>
            <Check size={16} />
            Salvar
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 gap-3">
        {/* Paleta */}
        {canEdit && (
          <div className="hidden w-52 shrink-0 flex-col overflow-y-auto rounded-xl border border-gray-200 bg-panel p-3 md:flex">
            <PaletteGroup title="Gatilhos" defs={triggers} onAdd={addNode} />
            <div className="my-3 h-px bg-gray-100" />
            <PaletteGroup title="Ações" defs={actions} onAdd={addNode} />
          </div>
        )}

        {/* Canvas */}
        <div className="relative min-w-0 flex-1">
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            selectedId={selectedId}
            nodeSummary={nodeSummary}
            onSelect={setSelectedId}
            onNodeMove={moveNode}
            onConnect={connect}
            onDeleteEdge={deleteEdge}
          />
          {nodes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-gray-500">Comece adicionando um gatilho</p>
              <p className="mt-1 text-xs text-gray-400">
                Escolha na paleta à esquerda o que inicia a trajetória.
              </p>
            </div>
          )}
        </div>

        {/* Configuração do nó selecionado */}
        {selectedNode && canEdit && (
          <NodeConfigPanel
            node={selectedNode}
            options={options}
            onChange={updateConfig}
            onDelete={deleteNode}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>
    </div>
  );
}

function PaletteGroup({
  title,
  defs,
  onAdd,
}: {
  title: string;
  defs: typeof FLOW_CATALOG;
  onAdd: (kind: string) => void;
}) {
  return (
    <div>
      <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      <div className="space-y-1.5">
        {defs.map((def) => {
          const Icon = def.icon;
          return (
            <button
              key={def.kind}
              type="button"
              onClick={() => onAdd(def.kind)}
              className="group flex w-full items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-left transition-colors hover:border-gray-300 hover:bg-gray-50"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${def.accent}1a`, color: def.accent }}
              >
                <Icon size={16} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-700">{def.label}</span>
              <Plus size={14} className="shrink-0 text-gray-300 group-hover:text-gray-500" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
