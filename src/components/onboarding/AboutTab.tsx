import { CheckCircle2, KeyRound } from "lucide-react";
import { FEATURES, HOW_IT_WORKS } from "@/lib/marketing/content";

export function AboutTab() {
  return (
    <div className="space-y-10">
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900">O CRM com IA multi-agente pra sua equipe de vendas</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-600">
          Pipeline, WhatsApp e agentes de IA que atendem, qualificam e cobram por você — o Vorlo administra
          tudo isso a partir de uma conversa. Dá uma olhada no que vem incluso antes de escolher o plano.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-gray-200 bg-panel p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <f.icon size={20} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">{f.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{f.description}</p>
          </div>
        ))}
      </div>

      <div>
        <h3 className="text-center text-lg font-bold text-gray-900">Como funciona</h3>
        <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white">
                <step.icon size={22} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Passo {i + 1}</p>
              <h4 className="mt-1 text-base font-semibold text-gray-900">{step.title}</h4>
              <p className="mt-2 text-sm text-gray-500">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto flex max-w-2xl items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <KeyRound size={20} className="mt-0.5 shrink-0 text-indigo-600" />
        <div>
          <h4 className="text-sm font-semibold text-indigo-900">Traga sua própria chave de IA</h4>
          <p className="mt-1 text-sm text-indigo-800">
            Já tem uma conta na Anthropic? Cole sua chave já no cadastro (ou depois, em Configurações) e use ela
            nos agentes de IA — sem depender de créditos compartilhados.
          </p>
        </div>
      </div>

      <ul className="mx-auto max-w-2xl space-y-2">
        {[
          "Cada empresa fica isolada — ninguém vê dado de outro CRM",
          "Pagamento via PIX, boleto ou cartão, sem precisar ter conta no Mercado Pago",
          "Suporte pelo próprio Vorlo, direto no CRM",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
