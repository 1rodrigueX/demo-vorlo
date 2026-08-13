"use client";

import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ErpBreadcrumb } from "@/components/erp/layout/ErpBreadcrumb";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";

export default function ConfiguracaoFiscalPage() {
  const tenantSlug = useTenantSlug();

  return (
    <div className="space-y-5">
      <ErpBreadcrumb items={[{ label: "Fiscal", href: "/erp/fiscal" }, { label: "Configuração fiscal" }]} tenantSlug={tenantSlug} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Configuração fiscal</h1>
        <p className="mt-1 text-sm text-gray-500">Parâmetros usados na emissão de notas fiscais eletrônicas.</p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800">
          Esta tela mostra a estrutura da configuração fiscal. A emissão real de NF-e, validação com a SEFAZ e certificado
          digital serão implementadas em uma fase futura, após a aprovação deste layout.
        </p>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Emissor</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fc-razao">Razão social</Label>
            <Input id="fc-razao" defaultValue="Sua Empresa Ltda" disabled />
          </div>
          <div>
            <Label htmlFor="fc-cnpj">CNPJ</Label>
            <Input id="fc-cnpj" defaultValue="00.000.000/0001-00" disabled />
          </div>
          <div>
            <Label htmlFor="fc-regime">Regime tributário</Label>
            <Select id="fc-regime" defaultValue="simples" disabled>
              <option value="simples">Simples Nacional</option>
              <option value="presumido">Lucro Presumido</option>
              <option value="real">Lucro Real</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="fc-ambiente">Ambiente de emissão</Label>
            <Select id="fc-ambiente" defaultValue="homologacao" disabled>
              <option value="homologacao">Homologação (testes)</option>
              <option value="producao">Produção</option>
            </Select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">Numeração e certificado</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fc-serie">Série padrão</Label>
            <Input id="fc-serie" defaultValue="1" disabled />
          </div>
          <div>
            <Label htmlFor="fc-proximo">Próximo número</Label>
            <Input id="fc-proximo" defaultValue="4532" disabled />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="fc-cert">Certificado digital (A1)</Label>
            <Input id="fc-cert" defaultValue="Nenhum certificado configurado" disabled />
          </div>
        </div>
      </Card>
    </div>
  );
}
