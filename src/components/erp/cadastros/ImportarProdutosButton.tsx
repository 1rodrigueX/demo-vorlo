"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Sparkles, Upload, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  extrairProdutosDeArquivo,
  confirmarImportacaoProdutos,
  type ProdutoExtraido,
} from "@/lib/actions/erp-produtos-import";

const ACCEPT = ".xlsx,.xlsm,.xls,.ods,.csv,.tsv,.txt,.pdf,image/*";

/**
 * Importa produtos de um arquivo (planilha, CSV, PDF ou foto da tabela) via IA.
 * Fluxo em dois passos de propósito: a IA extrai e mostra a PRÉVIA editável;
 * nada entra no catálogo antes do dono revisar e confirmar.
 */
export function ImportarProdutosButton() {
  const [open, setOpen] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoExtraido[] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, startExtract] = useTransition();
  const [isSaving, startSave] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setProdutos(null);
    setAviso(null);
    setFileName(null);
    setError(null);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    const formData = new FormData();
    formData.append("file", file);
    startExtract(async () => {
      const result = await extrairProdutosDeArquivo(formData);
      if ("error" in result) {
        setError(result.error);
        setProdutos(null);
        return;
      }
      setProdutos(result.produtos);
      setAviso(result.aviso ?? null);
    });
  }

  function updateRow(index: number, patch: Partial<ProdutoExtraido>) {
    setProdutos((rows) => (rows ? rows.map((r, i) => (i === index ? { ...r, ...patch } : r)) : rows));
  }

  function removeRow(index: number) {
    setProdutos((rows) => (rows ? rows.filter((_, i) => i !== index) : rows));
  }

  function confirm() {
    if (!produtos?.length) return;
    startSave(async () => {
      const result = await confirmarImportacaoProdutos(produtos);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.ignorados > 0
          ? `${result.criados} produto(s) importado(s). ${result.ignorados} ignorado(s) (já existiam ou dados inválidos).`
          : `${result.criados} produto(s) importado(s).`,
      );
      close();
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Sparkles size={16} />
        Importar com IA
      </Button>

      <Modal open={open} onClose={close} title="Importar produtos com IA" className="max-w-4xl">
        {!produtos ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Envie a tabela do fornecedor ou sua lista de preços — planilha (.xlsx, .xls, .ods), CSV, PDF ou
              até uma foto da tabela. A IA lê o arquivo e monta os produtos; você confere antes de salvar.
            </p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isExtracting}
              className="flex w-full flex-col items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-10 text-center hover:border-gray-400 hover:bg-gray-50 disabled:opacity-60"
            >
              <Upload size={22} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {isExtracting ? `Lendo ${fileName}...` : "Escolher arquivo"}
              </span>
              <span className="text-xs text-gray-400">Planilha, CSV, PDF ou imagem — até 10 MB</span>
            </button>

            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600">
                <span className="font-medium text-gray-900">{produtos.length} produto(s)</span> encontrado(s) em{" "}
                {fileName}. Revise antes de salvar.
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                Trocar arquivo
              </Button>
            </div>

            {aviso && (
              <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                {aviso}
              </p>
            )}

            <div className="max-h-[45vh] overflow-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="sticky top-0 bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-2 py-2 font-medium">Produto</th>
                    <th className="px-2 py-2 font-medium">SKU</th>
                    <th className="px-2 py-2 font-medium">Un.</th>
                    <th className="px-2 py-2 font-medium">Custo</th>
                    <th className="px-2 py-2 font-medium">Venda</th>
                    <th className="px-2 py-2 font-medium">Qtd</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {produtos.map((p, i) => (
                    <tr key={i}>
                      <td className="px-2 py-1.5">
                        <Input value={p.name} onChange={(e) => updateRow(i, { name: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5 w-28">
                        <Input value={p.sku} onChange={(e) => updateRow(i, { sku: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5 w-20">
                        <Input value={p.unit} onChange={(e) => updateRow(i, { unit: e.target.value })} />
                      </td>
                      <td className="px-2 py-1.5 w-28">
                        <Input
                          type="number"
                          step="0.01"
                          value={p.costPriceReais}
                          onChange={(e) => updateRow(i, { costPriceReais: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-2 py-1.5 w-28">
                        <Input
                          type="number"
                          step="0.01"
                          value={p.salePriceReais}
                          onChange={(e) => updateRow(i, { salePriceReais: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-2 py-1.5 w-24">
                        <Input
                          type="number"
                          value={p.quantity}
                          onChange={(e) => updateRow(i, { quantity: Number(e.target.value) })}
                        />
                      </td>
                      <td className="px-2 py-1.5 w-10">
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(i)}>
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3">
              <Button type="button" isLoading={isSaving} onClick={confirm} disabled={!produtos.length}>
                Importar {produtos.length} produto(s)
              </Button>
              <Button type="button" variant="secondary" onClick={close}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
