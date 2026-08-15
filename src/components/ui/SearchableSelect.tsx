"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type SearchableOption = {
  value: string;
  /** Linha principal (ex.: nome do cliente). */
  label: string;
  /** Linha secundária, menor (ex.: "123.456.789-00 · (11) 99999-8888"). */
  sublabel?: string;
  /** Texto usado na busca — junte aqui tudo que deve ser pesquisável. */
  searchText: string;
};

/** Tira acento, pontuação e caixa: "João (11) 9 9999-8888" -> "joao 11999998888". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Só os dígitos — deixa buscar CPF/telefone do jeito que a pessoa lembrar. */
function digitsOnly(text: string): string {
  return text.replace(/\D/g, "");
}

/**
 * Select com busca. Existe porque um <select> nativo com centenas de clientes
 * obriga a rolar procurando pelo nome exato — aqui dá pra achar digitando
 * qualquer pedaço do nome, do CPF/CNPJ ou do telefone, com ou sem pontuação.
 */
export function SearchableSelect({
  id,
  value,
  onChange,
  options,
  placeholder = "Selecione",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nada encontrado.",
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return options;
    const qText = normalize(q);
    const qDigits = digitsOnly(q);
    return options.filter((o) => {
      const haystack = normalize(o.searchText);
      if (haystack.includes(qText)) return true;
      // Busca por número (CPF/CNPJ/telefone) ignorando pontuação dos dois lados.
      return qDigits.length >= 2 && digitsOnly(o.searchText).includes(qDigits);
    });
  }, [options, query]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function openMenu() {
    setOpen(true);
    setQuery("");
    setHighlight(0);
    // Foca a busca no próximo frame, quando o input já existe no DOM.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function pick(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
    setQuery("");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Enter" && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight].value);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        id={id}
        type="button"
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-gray-300 bg-panel px-3 py-2 text-left text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <span className={cn("min-w-0 truncate", !selected && "text-gray-400")}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {selected && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Limpar seleção"
              onClick={(e) => {
                e.stopPropagation();
                pick("");
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-panel shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
            <Search size={14} className="shrink-0 text-gray-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
            />
          </div>

          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-center text-sm text-gray-500">{emptyMessage}</li>
            ) : (
              filtered.map((o, i) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pick(o.value)}
                    className={cn(
                      "block w-full px-3 py-2 text-left",
                      i === highlight ? "bg-gray-100" : "hover:bg-gray-50",
                      o.value === value && "font-medium",
                    )}
                  >
                    <p className="truncate text-sm text-gray-900">{o.label}</p>
                    {o.sublabel && <p className="truncate text-xs text-gray-500">{o.sublabel}</p>}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
