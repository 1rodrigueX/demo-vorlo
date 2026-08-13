"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const FAQ_ITEMS = [
  {
    question: "Como funciona o pagamento?",
    answer:
      "Pelo Mercado Pago — você paga com PIX, boleto ou cartão de crédito, sem precisar ter conta no Mercado Pago pra isso.",
  },
  {
    question: "A cobrança é automática todo mês?",
    answer:
      "A gente gera a cobrança do mês e te avisa por e-mail com o link de pagamento. Ainda não é débito automático no cartão — é só clicar e pagar quando chegar o aviso.",
  },
  {
    question: "O que acontece se eu esquecer de pagar?",
    answer:
      "Você tem uma folga de alguns dias após o vencimento pra regularizar sem perder o acesso. Passado esse prazo, o CRM fica suspenso até o pagamento ser confirmado — mas nada é apagado.",
  },
  {
    question: "Posso ajustar vendedores, gestores ou trocar de plano depois?",
    answer:
      "Hoje isso é definido no momento da assinatura. Se precisar ajustar depois (mais vendedores, outro plano, etc.), é só mandar uma mensagem aqui na aba Feedback que a gente resolve com você.",
  },
  {
    question: "Meus dados ficam visíveis pra outras empresas?",
    answer:
      "Não. Cada empresa (tenant) é completamente isolada no banco de dados — ninguém de fora enxerga contatos, negócios ou conversas de outro CRM.",
  },
  {
    question: "Preciso entender de tecnologia pra configurar?",
    answer:
      "Não. WhatsApp, Bling, Gmail, Outlook e os agentes de IA são conectados direto na tela de Configurações, sem precisar mexer em código.",
  },
  {
    question: "Posso usar minha própria chave da Anthropic (IA)?",
    answer:
      "Sim, é opcional. Se você já tem uma conta na Anthropic, cola sua chave no cadastro (ou depois em Configurações) e os agentes de IA passam a usar ela.",
  },
  {
    question: "E se eu tiver uma dúvida depois de assinar?",
    answer:
      "O Vorlo (nosso agente de IA principal) fica disponível dentro do CRM, na aba Suporte, pra tirar dúvidas de uso a qualquer hora. E essa aba de Feedback aqui também chega direto pra gente.",
  },
];

export function FaqTab() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-2xl divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-panel">
      {FAQ_ITEMS.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-medium text-gray-900">{item.question}</span>
              <ChevronDown
                size={18}
                className={cn("shrink-0 text-gray-400 transition-transform", isOpen && "rotate-180")}
              />
            </button>
            {isOpen && <p className="px-5 pb-4 text-sm text-gray-600">{item.answer}</p>}
          </div>
        );
      })}
    </div>
  );
}
