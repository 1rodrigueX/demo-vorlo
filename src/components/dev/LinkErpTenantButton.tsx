"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { linkCrmToErpTenant } from "@/lib/actions/dev-erp-link";

/**
 * Vincula um CRM que já tem tenant (mas não tem ERP) a um tenant ERP
 * standalone comprado separadamente pelo mesmo cliente — pedido do próprio
 * suporte, feito manualmente aqui. Concede ERP grátis pro CRM (ver
 * dev-erp-link.ts) e, opcionalmente, copia os cadastros de back-office do
 * ERP antigo.
 */
export function LinkErpTenantButton({ crmTenantId, crmTenantName }: { crmTenantId: string; crmTenantName: string }) {
  const [open, setOpen] = useState(false);
  const [erpSlug, setErpSlug] = useState("");
  const [copyData, setCopyData] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!erpSlug.trim()) return;

    startTransition(async () => {
      const result = await linkCrmToErpTenant(crmTenantId, erpSlug, { copyBackofficeData: copyData });
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`ERP vinculado a "${crmTenantName}".`);
      setOpen(false);
      setErpSlug("");
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Link2 size={14} />
        Vincular ERP
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Vincular ERP a "${crmTenantName}"`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500">
            Concede ERP grátis a este CRM (o cliente já pagou pelo ERP separado). Os dois tenants continuam existindo
            separados — isso não apaga nem desliga o ERP standalone antigo.
          </p>
          <div>
            <Label htmlFor="link-erp-slug">Slug do tenant ERP standalone</Label>
            <Input
              id="link-erp-slug"
              value={erpSlug}
              onChange={(e) => setErpSlug(e.target.value)}
              placeholder="ex: minha-empresa-erp"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={copyData}
              onChange={(e) => setCopyData(e.target.checked)}
              className="rounded border-gray-300"
            />
            Copiar Produtos/Categorias/Fornecedores/Funcionários do ERP antigo
          </label>
          <Button type="submit" isLoading={isPending} className="w-full">
            Vincular
          </Button>
        </form>
      </Modal>
    </>
  );
}
