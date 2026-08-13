import type { ReactNode } from "react";

export type DocumentMeta = { label: string; value: string };

/**
 * "Papel timbrado" reusado por Proposta (PDF preview), Pedido de venda e
 * Relatório de produção. O conteúdo dentro de #erp-print-area é o único
 * visível quando o usuário imprime (ver documents/print.css) — a Sidebar,
 * Topbar e qualquer chrome ao redor somem automaticamente.
 */
export function DocumentLayout({
  id = "erp-print-area",
  title,
  documentNumber,
  issuer,
  meta,
  children,
  footer,
}: {
  id?: string;
  title: string;
  documentNumber?: string;
  issuer?: { name: string; document?: string };
  meta?: DocumentMeta[];
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div id={id} className="mx-auto max-w-3xl rounded-xl border border-gray-200 bg-panel p-8 print:max-w-none print:rounded-none print:border-0 print:p-0">
      <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <p className="text-lg font-bold tracking-tight text-gray-900">{issuer?.name ?? "Sua Empresa"}</p>
          {issuer?.document && <p className="text-xs text-gray-500">{issuer.document}</p>}
        </div>
        <div className="text-right">
          <h1 className="text-base font-semibold text-gray-900">{title}</h1>
          {documentNumber && <p className="text-sm text-gray-500">{documentNumber}</p>}
        </div>
      </div>

      {meta && meta.length > 0 && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-gray-100 py-5 sm:grid-cols-3">
          {meta.map((m) => (
            <div key={m.label}>
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{m.label}</p>
              <p className="mt-0.5 text-sm text-gray-800">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="py-5">{children}</div>

      {footer && <div className="border-t border-gray-100 pt-5">{footer}</div>}
    </div>
  );
}
