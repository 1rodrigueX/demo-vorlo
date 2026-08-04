"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { FlowNode, FlowEdge } from "@/lib/automations/flow-types";
import { getNodeDef } from "@/lib/automations/flow-catalog";

const NODE_WIDTH = 240;
const HANDLE_Y = 30; // distância (px) do topo do nó até o centro das alças
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 1.6;

type View = { panX: number; panY: number; zoom: number };

type Interaction =
  | { mode: "idle" }
  | { mode: "pan"; startX: number; startY: number; startPanX: number; startPanY: number; moved: boolean }
  | { mode: "node"; id: string; startX: number; startY: number; startNodeX: number; startNodeY: number; moved: boolean }
  | { mode: "connect"; source: string };

function outputPoint(n: FlowNode) {
  return { x: n.x + NODE_WIDTH, y: n.y + HANDLE_Y };
}
function inputPoint(n: FlowNode) {
  return { x: n.x, y: n.y + HANDLE_Y };
}
function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export function FlowCanvas({
  nodes,
  edges,
  selectedId,
  nodeSummary,
  onSelect,
  onNodeMove,
  onConnect,
  onDeleteEdge,
}: {
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedId: string | null;
  nodeSummary: (node: FlowNode) => string;
  onSelect: (id: string | null) => void;
  onNodeMove: (id: string, x: number, y: number) => void;
  onConnect: (source: string, target: string) => void;
  onDeleteEdge: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ panX: 40, panY: 40, zoom: 1 });
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const interaction = useRef<Interaction>({ mode: "idle" });
  const hoverInputRef = useRef<string | null>(null);
  // `connectSource`/`connectPreview` são estado (não ref) porque a aresta
  // "fantasma" é desenhada no render — ler a máquina de estado (ref) no render
  // é proibido (react-hooks/refs).
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [connectPreview, setConnectPreview] = useState<{ x: number; y: number } | null>(null);
  const [hoverEdge, setHoverEdge] = useState<string | null>(null);

  const nodeById = useCallback((id: string) => nodes.find((n) => n.id === id), [nodes]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    const { panX, panY, zoom } = viewRef.current;
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    return { x: (clientX - left - panX) / zoom, y: (clientY - top - panY) / zoom };
  }, []);

  // Um único par de listeners globais lê a máquina de estado em interaction.ref
  // — evita add/remove de listeners a cada gesto.
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const it = interaction.current;
      if (it.mode === "pan") {
        const dx = e.clientX - it.startX;
        const dy = e.clientY - it.startY;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) it.moved = true;
        setView((v) => ({ ...v, panX: it.startPanX + dx, panY: it.startPanY + dy }));
      } else if (it.mode === "node") {
        const zoom = viewRef.current.zoom;
        const dx = (e.clientX - it.startX) / zoom;
        const dy = (e.clientY - it.startY) / zoom;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) it.moved = true;
        onNodeMove(it.id, Math.round(it.startNodeX + dx), Math.round(it.startNodeY + dy));
      } else if (it.mode === "connect") {
        setConnectPreview(screenToWorld(e.clientX, e.clientY));
      }
    }
    function onUp() {
      const it = interaction.current;
      if (it.mode === "pan" && !it.moved) onSelect(null);
      if (it.mode === "connect") {
        const target = hoverInputRef.current;
        if (target && target !== it.source) onConnect(it.source, target);
        setConnectPreview(null);
        setConnectSource(null);
      }
      interaction.current = { mode: "idle" };
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [onNodeMove, onConnect, onSelect, screenToWorld]);

  // Zoom com a roda do mouse. Listener nativo com { passive: false } porque o
  // onWheel do React é passivo — e.preventDefault() lá seria ignorado (a página
  // rolaria junto ao dar zoom).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const { panX, panY, zoom } = viewRef.current;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const worldX = (cx - panX) / zoom;
      const worldY = (cy - panY) / zoom;
      setView({ zoom: next, panX: cx - worldX * next, panY: cy - worldY * next });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      onPointerDown={(e) => {
        // fundo: inicia pan
        interaction.current = {
          mode: "pan",
          startX: e.clientX,
          startY: e.clientY,
          startPanX: viewRef.current.panX,
          startPanY: viewRef.current.panY,
          moved: false,
        };
      }}
      className="synflow-grid relative h-full w-full cursor-grab touch-none overflow-hidden rounded-xl border border-gray-200 bg-gray-50 active:cursor-grabbing"
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})` }}
      >
        {/* Camada de arestas (SVG em coordenadas do "mundo") */}
        <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width={1} height={1}>
          <defs>
            <marker id="synflow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
              <path d="M0,0 L8,3 L0,6 Z" fill="#94a3b8" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const s = nodeById(edge.source);
            const t = nodeById(edge.target);
            if (!s || !t) return null;
            const p1 = outputPoint(s);
            const p2 = inputPoint(t);
            const active = hoverEdge === edge.id;
            return (
              <g key={edge.id}>
                <path
                  d={bezierPath(p1.x, p1.y, p2.x, p2.y)}
                  fill="none"
                  stroke={active ? "#ff5722" : "#94a3b8"}
                  strokeWidth={active ? 3 : 2}
                  markerEnd="url(#synflow-arrow)"
                />
                {/* faixa transparente larga só pra facilitar o hover/click */}
                <path
                  d={bezierPath(p1.x, p1.y, p2.x, p2.y)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={18}
                  className="pointer-events-auto cursor-pointer"
                  onPointerEnter={() => setHoverEdge(edge.id)}
                  onPointerLeave={() => setHoverEdge((h) => (h === edge.id ? null : h))}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </g>
            );
          })}
          {/* aresta "fantasma" enquanto conecta */}
          {connectSource &&
            connectPreview &&
            (() => {
              const s = nodeById(connectSource);
              if (!s) return null;
              const p1 = outputPoint(s);
              return (
                <path
                  d={bezierPath(p1.x, p1.y, connectPreview.x, connectPreview.y)}
                  fill="none"
                  stroke="#ff5722"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                />
              );
            })()}
        </svg>

        {/* Botão de apagar aresta (aparece ao passar o mouse) */}
        {edges.map((edge) => {
          if (hoverEdge !== edge.id) return null;
          const s = nodeById(edge.source);
          const t = nodeById(edge.target);
          if (!s || !t) return null;
          const p1 = outputPoint(s);
          const p2 = inputPoint(t);
          const mx = (p1.x + p2.x) / 2;
          const my = (p1.y + p2.y) / 2;
          return (
            <button
              key={`del-${edge.id}`}
              type="button"
              onPointerEnter={() => setHoverEdge(edge.id)}
              onPointerLeave={() => setHoverEdge((h) => (h === edge.id ? null : h))}
              onPointerDown={(e) => {
                e.stopPropagation();
                onDeleteEdge(edge.id);
                setHoverEdge(null);
              }}
              style={{ left: mx, top: my }}
              className="absolute z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 shadow-sm hover:border-red-300 hover:text-red-600"
              aria-label="Remover conexão"
            >
              <X size={13} />
            </button>
          );
        })}

        {/* Nós */}
        {nodes.map((node) => {
          const def = getNodeDef(node.kind);
          if (!def) return null;
          const Icon = def.icon;
          const isSelected = selectedId === node.id;
          const customLabel = typeof node.config._label === "string" ? node.config._label.trim() : "";
          return (
            <div
              key={node.id}
              style={{ left: node.x, top: node.y, width: NODE_WIDTH }}
              onPointerDown={(e) => {
                e.stopPropagation();
                onSelect(node.id);
                interaction.current = {
                  mode: "node",
                  id: node.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  startNodeX: node.x,
                  startNodeY: node.y,
                  moved: false,
                };
              }}
              className={cn(
                "absolute z-10 cursor-grab rounded-xl border bg-white shadow-sm transition-shadow active:cursor-grabbing",
                isSelected ? "border-transparent ring-2 ring-[#ff5722] shadow-md" : "border-gray-200 hover:shadow-md",
              )}
            >
              {/* alça de entrada (só ações têm) */}
              {node.type === "action" && (
                <span
                  onPointerEnter={() => (hoverInputRef.current = node.id)}
                  onPointerLeave={() => {
                    if (hoverInputRef.current === node.id) hoverInputRef.current = null;
                  }}
                  style={{ top: HANDLE_Y }}
                  className="absolute -left-[7px] z-20 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-gray-300 bg-white"
                  aria-hidden
                />
              )}
              {/* alça de saída (arrastável pra conectar) */}
              <span
                onPointerDown={(e) => {
                  e.stopPropagation();
                  interaction.current = { mode: "connect", source: node.id };
                  setConnectSource(node.id);
                  setConnectPreview(screenToWorld(e.clientX, e.clientY));
                }}
                style={{ top: HANDLE_Y }}
                className="absolute -right-[7px] z-20 h-3.5 w-3.5 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-[#ff5722] bg-white hover:bg-[#ff5722]"
                aria-label="Arraste para conectar"
              />

              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${def.accent}1a`, color: def.accent }}
                >
                  <Icon size={18} strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-gray-900">{customLabel || def.label}</p>
                  <p className="truncate text-[11px] text-gray-400">
                    {node.type === "trigger" ? "Gatilho" : "Ação"}
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-100 px-3 py-2">
                <p className="line-clamp-2 text-[11.5px] leading-snug text-gray-500">{nodeSummary(node)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
