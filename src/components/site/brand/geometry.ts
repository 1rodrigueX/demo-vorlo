/** Geometria da marca VORLO — 7 nós, 13 arestas + flanco curvo esquerdo.
 * viewBox 0 0 120 136. Fonte única do símbolo. */

export type NodeId = "TL" | "UM" | "LM" | "C" | "R" | "BM" | "BL";

export interface BrandNode {
  id: NodeId;
  x: number;
  y: number;
  order: number;
}

export const VIEWBOX = { w: 120, h: 136 } as const;
export const NODE_R = 8.7;
export const STROKE_W = 8.2;

export const NODES: BrandNode[] = [
  { id: "TL", x: 15.4, y: 8.7, order: 0 },
  { id: "UM", x: 64.1, y: 38.9, order: 2 },
  { id: "LM", x: 8.7, y: 68.3, order: 4 },
  { id: "C", x: 52.5, y: 68.3, order: 1 },
  { id: "R", x: 111.3, y: 68.3, order: 3 },
  { id: "BM", x: 64.1, y: 97.9, order: 5 },
  { id: "BL", x: 15.4, y: 127.3, order: 6 },
];

export const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n])) as Record<NodeId, BrandNode>;

export const EDGES: Array<[NodeId, NodeId]> = [
  ["TL", "C"],
  ["TL", "UM"],
  ["UM", "C"],
  ["TL", "R"],
  ["UM", "R"],
  ["C", "R"],
  ["UM", "LM"],
  ["LM", "BM"],
  ["C", "BM"],
  ["BM", "R"],
  ["C", "BL"],
  ["BL", "R"],
  ["BM", "BL"],
];

export const LEFT_FLANK = `M 15.4 8.7 Q 20.4 38.5 8.7 68.3 Q 20.4 97.8 15.4 127.3`;

export function edgeLength([a, b]: [NodeId, NodeId]): number {
  const p = NODE_BY_ID[a];
  const q = NODE_BY_ID[b];
  return Math.hypot(q.x - p.x, q.y - p.y);
}
