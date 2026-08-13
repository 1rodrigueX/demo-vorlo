"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Modal } from "@/components/ui/Modal";
import { ErpBreadcrumb } from "@/components/erp/layout/ErpBreadcrumb";
import { ProposalCustomerSection, type CustomerSectionValue } from "@/components/erp/forms/ProposalCustomerSection";
import { ProposalItemsTable, itemSubtotal, newDraftItem, type DraftItem } from "@/components/erp/forms/ProposalItemsTable";
import { ProposalTermsSection, type TermsSectionValue } from "@/components/erp/forms/ProposalTermsSection";
import { ProposalTotalsSummary } from "@/components/erp/forms/ProposalTotalsSummary";
import { ProposalFormActions } from "@/components/erp/forms/ProposalFormActions";
import { DocumentLayout } from "@/components/erp/documents/DocumentLayout";
import { PrintButton } from "@/components/erp/documents/PrintButton";
import { useTenantSlug } from "@/lib/tenant/useTenantSlug";
import { formatCurrency } from "@/lib/utils/currency";
import { formatShortDate } from "@/components/erp/lib/format";

function defaultValidUntil(): string {
  const d = new Date();
  d.setDate(d.getDate() + 15);
  return d.toISOString().slice(0, 10);
}

export default function NovaPropostaPage() {
  const tenantSlug = useTenantSlug();
  const router = useRouter();

  const [customer, setCustomer] = useState<CustomerSectionValue>({ customerName: "", sellerName: "", validUntil: defaultValidUntil() });
  const [items, setItems] = useState<DraftItem[]>([newDraftItem()]);
  const [terms, setTerms] = useState<TermsSectionValue>({ paymentTerm: "", freightType: "CIF", carrier: "" });
  const [discount, setDiscount] = useState(0);
  const [freight, setFreight] = useState(0);
  const [notes, setNotes] = useState("");
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = useMemo(() => items.reduce((s, i) => s + itemSubtotal(i), 0), [items]);
  const total = subtotal + freight - discount;

  function validate(): string | null {
    if (!customer.customerName) return "Selecione um cliente.";
    if (!items.some((i) => i.productName)) return "Adicione ao menos um produto.";
    return null;
  }

  function handleAction(kind: "draft" | "send") {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setIsSubmitting(true);
    // Fase visual: sem persistência real — só simula o feedback de sucesso.
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success(kind === "draft" ? "Proposta salva como rascunho." : "Proposta enviada para o cliente.");
      router.push(`/${tenantSlug}/erp/vendas/propostas`);
    }, 500);
  }

  return (
    <div className="space-y-5">
      <div>
        <ErpBreadcrumb
          items={[{ label: "Vendas", href: "/erp/vendas" }, { label: "Propostas comerciais", href: "/erp/vendas/propostas" }, { label: "Nova proposta" }]}
          tenantSlug={tenantSlug}
        />
        <h1 className="mt-1 text-xl font-semibold tracking-tight text-gray-900">Nova proposta</h1>
      </div>

      <ProposalCustomerSection value={customer} onChange={setCustomer} />
      <ProposalItemsTable items={items} onChange={setItems} />
      <ProposalTermsSection value={terms} onChange={setTerms} />

      <Card className="p-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Observações</h2>
        <Label htmlFor="proposal-notes" className="sr-only">
          Observações
        </Label>
        <Textarea
          id="proposal-notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Alguma observação importante sobre esta proposta..."
        />
      </Card>

      <ProposalTotalsSummary subtotal={subtotal} discount={discount} freight={freight} onDiscountChange={setDiscount} onFreightChange={setFreight} />

      <ProposalFormActions
        onCancel={() => router.push(`/${tenantSlug}/erp/vendas/propostas`)}
        onGeneratePdf={() => setPdfPreviewOpen(true)}
        onSaveDraft={() => handleAction("draft")}
        onSend={() => handleAction("send")}
        isSubmitting={isSubmitting}
      />

      <Modal open={pdfPreviewOpen} onClose={() => setPdfPreviewOpen(false)} title="Pré-visualização da proposta" className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <div className="erp-print-hide mb-4 flex justify-end">
          <PrintButton />
        </div>
        <DocumentLayout
          title="Proposta Comercial"
          documentNumber="Rascunho"
          issuer={{ name: "Sua Empresa Ltda", document: "00.000.000/0001-00" }}
          meta={[
            { label: "Cliente", value: customer.customerName || "—" },
            { label: "Vendedor", value: customer.sellerName || "—" },
            { label: "Validade", value: customer.validUntil ? formatShortDate(customer.validUntil) : "—" },
            { label: "Pagamento", value: terms.paymentTerm || "—" },
            { label: "Frete", value: terms.freightType },
            { label: "Transportadora", value: terms.carrier || "—" },
          ]}
          footer={
            <div className="ml-auto w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Desconto</span>
                <span>-{formatCurrency(discount)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Frete</span>
                <span>{formatCurrency(freight)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-1.5 text-base font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-2">Produto</th>
                <th className="py-2 text-right">Qtd.</th>
                <th className="py-2 text-right">Preço unit.</th>
                <th className="py-2 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.filter((i) => i.productName).map((item) => (
                <tr key={item.key} className="border-b border-gray-100 last:border-0">
                  <td className="py-2.5 text-gray-800">{item.productName}</td>
                  <td className="py-2.5 text-right text-gray-600">{item.quantity}</td>
                  <td className="py-2.5 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2.5 text-right font-medium text-gray-800">{formatCurrency(itemSubtotal(item))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {notes && (
            <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
              <span className="font-medium text-gray-800">Observações: </span>
              {notes}
            </p>
          )}
        </DocumentLayout>
      </Modal>
    </div>
  );
}
