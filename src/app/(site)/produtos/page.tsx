"use client";

import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, LayoutDashboard, Truck, Wallet, Boxes, Factory, Check } from "lucide-react";
import { MagicCard } from "@/components/site/MagicCard";
import { CtaButton } from "@/components/site/CtaButton";

const PRODUTOS = [
  {
    id: "crm",
    icon: LayoutDashboard,
    nome: "CRM de Vendas com IA",
    descricao: "Pipeline, WhatsApp e agentes de IA que atendem, qualificam e cobram por você.",
    pontos: ["Pipeline + WhatsApp integrados", "Agentes de IA (Synexa)", "Multi-empresa e permissões"],
    href: "/signup",
    cta: "Criar conta grátis",
    destaque: true,
  },
  {
    id: "transportadora",
    icon: Truck,
    nome: "Transportadora",
    descricao: "App de gestão de fretes, clientes e motoristas — sua operação de transporte no controle.",
    pontos: ["Gestão de fretes e rotas", "Clientes e motoristas", "App para o dia a dia"],
    href: "/comprar-transportadora",
    cta: "Assinar",
    destaque: false,
  },
  {
    id: "financas",
    icon: Wallet,
    nome: "Finanças",
    descricao: "Controle financeiro completo — fluxo de caixa, contas, boletos e relatórios.",
    pontos: ["Fluxo de caixa", "Contas e boletos", "Relatórios por categoria"],
    href: "/comprar-financas",
    cta: "Assinar",
    destaque: false,
  },
  {
    id: "estoque",
    icon: Boxes,
    nome: "Estoque",
    descricao: "Controle de itens, entradas e saídas, com valor total sempre atualizado.",
    pontos: ["Itens e movimentações", "Entradas e saídas", "Valor em estoque"],
    href: "/comprar-estoque",
    cta: "Assinar",
    destaque: false,
  },
  {
    id: "producao",
    icon: Factory,
    nome: "Produção",
    descricao: "Turnos, máquinas, produtos e apontamento de produção do chão de fábrica.",
    pontos: ["Turnos e máquinas", "Produtos e receitas", "Apontamento de produção"],
    href: "/comprar-producao",
    cta: "Assinar",
    destaque: false,
  },
] as const;

export default function ProdutosPage() {
  return (
    <section className="relative min-h-[100svh] px-5 pb-28 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto w-full max-w-[1240px]">
        <a href="/" className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm text-grey transition-colors hover:text-ignite">
          <ArrowLeft size={15} />
          Voltar para o início
        </a>

        <motion.header
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mb-14 max-w-2xl"
        >
          <p className="type-eyebrow mb-4">Produtos</p>
          <h1 className="type-display text-[clamp(2.1rem,5.5vw,3.6rem)] text-white-soft text-balance">
            Ferramentas para <span className="text-ignite">vender e operar</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-grey sm:text-lg">
            Software próprio da Synexa. Assine só o que a sua operação precisa — cada produto funciona sozinho ou
            integrado aos outros.
          </p>
        </motion.header>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PRODUTOS.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
              className="h-full"
            >
              <MagicCard
                className={
                  "h-full rounded-xl border bg-carbon-800 " +
                  (p.destaque ? "border-ignite/50" : "border-carbon-700")
                }
              >
                <div className="flex h-full flex-col p-7">
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-lg border border-carbon-700 bg-carbon-900 text-ignite">
                      <p.icon size={20} strokeWidth={1.8} />
                    </span>
                    {p.destaque ? (
                      <span className="type-mono-label rounded-full bg-ignite/15 px-2.5 py-1 text-[0.62rem] uppercase tracking-[0.16em] text-ignite">
                        Principal
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-5 type-display text-[1.35rem] leading-tight text-white-soft">{p.nome}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-grey">{p.descricao}</p>
                  <ul className="mt-5 flex-1 space-y-2 border-t border-carbon-700 pt-5">
                    {p.pontos.map((pt) => (
                      <li key={pt} className="flex items-start gap-2 text-[0.82rem] text-grey">
                        <Check size={14} className="mt-0.5 shrink-0 text-ignite" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <CtaButton href={p.href} variant={p.destaque ? "primary" : "ghost"} className="mt-6 w-full">
                    {p.cta}
                    <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
                  </CtaButton>
                </div>
              </MagicCard>
            </motion.div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-grey">
          Já é cliente?{" "}
          <a href="/central" className="font-medium text-ignite hover:underline">
            Meus acessos
          </a>
        </p>
      </div>
    </section>
  );
}
