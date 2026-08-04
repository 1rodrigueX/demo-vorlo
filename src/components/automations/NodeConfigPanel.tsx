"use client";

import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Label } from "@/components/ui/Label";
import type { FlowNode, FlowNodeConfig } from "@/lib/automations/flow-types";
import { getNodeDef, type FlowFieldDef } from "@/lib/automations/flow-catalog";

export type FlowOptions = {
  stages: { id: string; name: string }[];
  members: { id: string; name: string }[];
};

function selectOptions(field: FlowFieldDef, options: FlowOptions) {
  if (field.optionsSource === "stages") return options.stages.map((s) => ({ value: s.id, label: s.name }));
  if (field.optionsSource === "members") return options.members.map((m) => ({ value: m.id, label: m.name }));
  return field.staticOptions ?? [];
}

export function NodeConfigPanel({
  node,
  options,
  onChange,
  onDelete,
  onClose,
}: {
  node: FlowNode;
  options: FlowOptions;
  onChange: (config: FlowNodeConfig) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const def = getNodeDef(node.kind);
  if (!def) return null;
  const Icon = def.icon;

  const set = (key: string, value: string | number) => onChange({ ...node.config, [key]: value });

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-xl border border-gray-200 bg-panel">
      <div className="flex items-start gap-2.5 border-b border-gray-100 p-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${def.accent}1a`, color: def.accent }}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{def.label}</p>
          <p className="text-xs text-gray-400">{node.type === "trigger" ? "Gatilho" : "Ação"}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          Fechar
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <Label htmlFor="f-_label">Nome do passo (opcional)</Label>
          <Input
            id="f-_label"
            placeholder={def.label}
            value={typeof node.config._label === "string" ? node.config._label : ""}
            onChange={(e) => set("_label", e.target.value)}
          />
          <p className="mt-1 text-[11px] text-gray-400">Personalize como este passo aparece no fluxo.</p>
        </div>

        <div className="h-px bg-gray-100" />

        <p className="text-xs leading-relaxed text-gray-500">{def.description}</p>

        {def.fields.length === 0 && (
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-400">
            Este passo não precisa de configuração.
          </p>
        )}

        {def.fields.map((field) => {
          const value = node.config[field.key];
          return (
            <div key={field.key}>
              <Label htmlFor={`f-${field.key}`}>{field.label}</Label>
              {field.kind === "textarea" ? (
                <Textarea
                  id={`f-${field.key}`}
                  rows={3}
                  placeholder={field.placeholder}
                  value={typeof value === "string" ? value : ""}
                  onChange={(e) => set(field.key, e.target.value)}
                />
              ) : field.kind === "select" ? (
                <Select
                  id={`f-${field.key}`}
                  value={value != null ? String(value) : ""}
                  onChange={(e) => set(field.key, e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {selectOptions(field, options).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  id={`f-${field.key}`}
                  type={field.kind === "number" ? "number" : "text"}
                  min={field.min}
                  max={field.max}
                  placeholder={field.placeholder}
                  value={value != null ? String(value) : ""}
                  onChange={(e) =>
                    set(field.key, field.kind === "number" ? Number(e.target.value) : e.target.value)
                  }
                />
              )}
              {field.help && <p className="mt-1 text-[11px] text-gray-400">{field.help}</p>}
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-100 p-3">
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-red-600 hover:border-red-300 hover:bg-red-50"
        >
          <Trash2 size={15} />
          Remover passo
        </button>
      </div>
    </div>
  );
}
