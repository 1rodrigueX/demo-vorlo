// Tipos do grafo de uma trajetória (automação visual estilo n8n). O grafo
// inteiro é guardado no JSONB automation_flows.graph (ver 0069). Um nó é um
// gatilho ("trigger") ou uma ação ("action"); as arestas ligam a saída de um
// nó à entrada de outro. `kind` identifica o gatilho/ação específico dentro do
// catálogo (ver flow-catalog.ts) e `config` guarda os campos daquele kind.

export type FlowNodeType = "trigger" | "action";

export type FlowNodeConfig = Record<string, string | number | null>;

export type FlowNode = {
  id: string;
  type: FlowNodeType;
  kind: string;
  x: number;
  y: number;
  config: FlowNodeConfig;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
};

export type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export const EMPTY_GRAPH: FlowGraph = { nodes: [], edges: [] };

/** Normaliza um JSONB vindo do banco (que pode estar vazio/corrompido) num FlowGraph seguro. */
export function parseGraph(raw: unknown): FlowGraph {
  if (!raw || typeof raw !== "object") return { nodes: [], edges: [] };
  const obj = raw as { nodes?: unknown; edges?: unknown };
  const nodes = Array.isArray(obj.nodes) ? (obj.nodes as FlowNode[]) : [];
  const edges = Array.isArray(obj.edges) ? (obj.edges as FlowEdge[]) : [];
  return { nodes, edges };
}
