"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { CtaButton } from "@/components/site/CtaButton";
import { EMAIL_DESTINO, FAIXAS_ORCAMENTO, PRAZOS, QUOTE, TIPOS_PROJETO, WEB3FORMS_KEY, WHATSAPP } from "@/lib/site/content";

interface Campos {
  nome: string;
  empresa: string;
  email: string;
  telefone: string;
  tipo: string;
  orcamento: string;
  prazo: string;
  siteAtual: string;
  ideia: string;
}

const VAZIO: Campos = { nome: "", empresa: "", email: "", telefone: "", tipo: "", orcamento: "", prazo: "", siteAtual: "", ideia: "" };

type Erros = Partial<Record<keyof Campos, string>>;

function validar(c: Campos): Erros {
  const e: Erros = {};
  if (!c.nome.trim()) e.nome = "Diga como podemos te chamar.";
  if (!c.empresa.trim()) e.empresa = "Informe o nome da empresa ou da operação.";
  if (!c.email.trim()) e.email = "Precisamos de um e-mail para responder.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email.trim())) e.email = "Esse e-mail parece incompleto.";
  if (!c.telefone.trim()) e.telefone = "Informe um telefone com DDD.";
  else if (c.telefone.replace(/\D/g, "").length < 10) e.telefone = "Faltam dígitos — inclua o DDD.";
  if (!c.tipo) e.tipo = "Escolha o tipo de projeto.";
  if (!c.ideia.trim()) e.ideia = "Conte sua ideia — é o campo mais importante.";
  else if (c.ideia.trim().length < 25) e.ideia = "Detalhe um pouco mais: o que o site precisa resolver?";
  return e;
}

function montarMensagem(c: Campos): string {
  const linhas = [
    "SOLICITAÇÃO DE ORÇAMENTO — VORLO",
    "",
    `Nome: ${c.nome}`,
    `Empresa / operação: ${c.empresa}`,
    `E-mail: ${c.email}`,
    `Telefone: ${c.telefone}`,
    `Tipo de projeto: ${c.tipo}`,
  ];
  if (c.orcamento) linhas.push(`Faixa de orçamento: ${c.orcamento}`);
  if (c.prazo) linhas.push(`Prazo desejado: ${c.prazo}`);
  if (c.siteAtual.trim()) linhas.push(`Site atual: ${c.siteAtual}`);
  linhas.push("", "A IDEIA:", c.ideia);
  return linhas.join("\n");
}

const baseCampo =
  "w-full rounded-lg border bg-carbon-800 px-4 py-3.5 text-[16px] text-white-soft placeholder:text-carbon-600 transition-colors duration-200 focus:border-ignite focus:outline-none sm:text-[0.95rem]";

const CHEVRON = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23A0A0A0' stroke-width='2.5' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 1rem center",
  backgroundSize: "14px",
} as const;

function Campo({
  id,
  label,
  erro,
  obrigatorio,
  dica,
  children,
}: {
  id: string;
  label: string;
  erro?: string;
  obrigatorio?: boolean;
  dica?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-white-soft">
        {label}
        {obrigatorio ? (
          <span className="ml-1 text-ignite" aria-hidden>
            *
          </span>
        ) : (
          <span className="ml-2 font-normal text-grey">(opcional)</span>
        )}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="mt-2 flex items-center gap-1.5 text-[0.8rem] text-ignite">
          <AlertCircle size={13} strokeWidth={2.2} />
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="mt-2 text-[0.8rem] text-grey">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

export function QuoteForm() {
  const [campos, setCampos] = useState<Campos>(VAZIO);
  const [erros, setErros] = useState<Erros>({});
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [emailFalhou, setEmailFalhou] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const set = (k: keyof Campos) => (v: string) => {
    setCampos((c) => ({ ...c, [k]: v }));
    setErros((e) => (e[k] ? { ...e, [k]: undefined } : e));
  };

  const linkWhats = () => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
  const linkMailto = () =>
    `mailto:${EMAIL_DESTINO}?subject=${encodeURIComponent(`Orçamento — ${campos.empresa || campos.nome}`)}&body=${encodeURIComponent(mensagem)}`;

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    const e = validar(campos);
    setErros(e);
    if (Object.keys(e).length) {
      document.getElementById(Object.keys(e)[0])?.focus();
      return;
    }

    const msg = montarMensagem(campos);
    setMensagem(msg);
    setEnviando(true);

    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");

    if (WEB3FORMS_KEY) {
      try {
        const r = await fetch("https://api.web3forms.com/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            access_key: WEB3FORMS_KEY,
            subject: `Orçamento — ${campos.empresa}`,
            from_name: "Site VORLO",
            replyto: campos.email,
            nome: campos.nome,
            empresa: campos.empresa,
            email: campos.email,
            telefone: campos.telefone,
            tipo_de_projeto: campos.tipo,
            faixa_de_orcamento: campos.orcamento || "—",
            prazo: campos.prazo || "—",
            site_atual: campos.siteAtual || "—",
            ideia: campos.ideia,
            message: msg,
          }),
        });
        if (!r.ok) setEmailFalhou(true);
      } catch {
        setEmailFalhou(true);
      }
    } else {
      setEmailFalhou(true);
    }

    setEnviando(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-carbon-700 bg-carbon-800 p-8 sm:p-12"
      >
        <span className="mb-6 grid h-12 w-12 place-items-center rounded-full bg-ignite text-carbon-900">
          <Check size={22} strokeWidth={2.6} />
        </span>
        <h2 className="type-display text-[clamp(1.6rem,4vw,2.4rem)] text-white-soft">{QUOTE.successTitle}</h2>
        <p className="mt-4 max-w-lg text-[0.95rem] leading-relaxed text-grey">{QUOTE.successBody}</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <CtaButton href={linkWhats()} target="_blank" rel="noopener noreferrer">
            Abrir no WhatsApp
            <ArrowRight size={16} />
          </CtaButton>
          {emailFalhou ? (
            <CtaButton href={linkMailto()} variant="ghost">
              Enviar por e-mail
            </CtaButton>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setEnviado(false);
            setCampos(VAZIO);
            setEmailFalhou(false);
          }}
          className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm text-grey transition-colors hover:text-ignite"
        >
          <ArrowLeft size={15} />
          Enviar outra solicitação
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="rounded-2xl border border-carbon-700 bg-carbon-800 p-6 sm:p-9">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Campo id="nome" label="Seu nome" erro={erros.nome} obrigatorio>
          <input id="nome" type="text" autoComplete="name" value={campos.nome} onChange={(e) => set("nome")(e.target.value)} aria-invalid={!!erros.nome} placeholder="Como podemos te chamar" className={cn(baseCampo, erros.nome ? "border-ignite" : "border-carbon-700")} />
        </Campo>
        <Campo id="empresa" label="Empresa ou nome da operação" erro={erros.empresa} obrigatorio>
          <input id="empresa" type="text" autoComplete="organization" value={campos.empresa} onChange={(e) => set("empresa")(e.target.value)} aria-invalid={!!erros.empresa} placeholder="Razão social, marca ou projeto" className={cn(baseCampo, erros.empresa ? "border-ignite" : "border-carbon-700")} />
        </Campo>
        <Campo id="email" label="E-mail" erro={erros.email} obrigatorio>
          <input id="email" type="email" inputMode="email" autoComplete="email" value={campos.email} onChange={(e) => set("email")(e.target.value)} aria-invalid={!!erros.email} placeholder="voce@empresa.com.br" className={cn(baseCampo, erros.email ? "border-ignite" : "border-carbon-700")} />
        </Campo>
        <Campo id="telefone" label="WhatsApp / telefone" erro={erros.telefone} obrigatorio>
          <input id="telefone" type="tel" inputMode="tel" autoComplete="tel" value={campos.telefone} onChange={(e) => set("telefone")(e.target.value)} aria-invalid={!!erros.telefone} placeholder="(11) 90000-0000" className={cn(baseCampo, erros.telefone ? "border-ignite" : "border-carbon-700")} />
        </Campo>
        <div className="sm:col-span-2">
          <Campo id="tipo" label="O que você precisa" erro={erros.tipo} obrigatorio>
            <select id="tipo" value={campos.tipo} onChange={(e) => set("tipo")(e.target.value)} aria-invalid={!!erros.tipo} className={cn(baseCampo, "appearance-none pr-11", campos.tipo ? "text-white-soft" : "text-carbon-600", erros.tipo ? "border-ignite" : "border-carbon-700")} style={CHEVRON}>
              <option value="">Selecione uma opção</option>
              {TIPOS_PROJETO.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Campo>
        </div>
        <Campo id="orcamento" label="Faixa de orçamento">
          <select id="orcamento" value={campos.orcamento} onChange={(e) => set("orcamento")(e.target.value)} className={cn(baseCampo, "appearance-none border-carbon-700 pr-11", campos.orcamento ? "text-white-soft" : "text-carbon-600")} style={CHEVRON}>
            <option value="">Prefiro não informar</option>
            {FAIXAS_ORCAMENTO.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </Campo>
        <Campo id="prazo" label="Prazo desejado">
          <select id="prazo" value={campos.prazo} onChange={(e) => set("prazo")(e.target.value)} className={cn(baseCampo, "appearance-none border-carbon-700 pr-11", campos.prazo ? "text-white-soft" : "text-carbon-600")} style={CHEVRON}>
            <option value="">Sem data definida</option>
            {PRAZOS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Campo>
        <div className="sm:col-span-2">
          <Campo id="siteAtual" label="Site atual" dica="Se já existe algum, o endereço ajuda a entender o ponto de partida.">
            <input id="siteAtual" type="url" inputMode="url" value={campos.siteAtual} onChange={(e) => set("siteAtual")(e.target.value)} placeholder="https://" className={cn(baseCampo, "border-carbon-700")} />
          </Campo>
        </div>
        <div className="sm:col-span-2">
          <Campo id="ideia" label="Sua ideia" erro={erros.ideia} obrigatorio dica="O que a empresa faz, quem é o cliente e o que o site precisa resolver. Quanto mais detalhe, mais preciso o orçamento.">
            <textarea id="ideia" rows={7} value={campos.ideia} onChange={(e) => set("ideia")(e.target.value)} aria-invalid={!!erros.ideia} placeholder="Ex: temos uma distribuidora de peças e vendemos por telefone. Quero um site onde o cliente veja o catálogo e peça orçamento sozinho, e uma área de login para revendedores." className={cn(baseCampo, "resize-y leading-relaxed", erros.ideia ? "border-ignite" : "border-carbon-700")} />
          </Campo>
        </div>
      </div>

      <div className="mt-9 flex flex-col gap-5 border-t border-carbon-700 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-[0.78rem] leading-relaxed text-grey">
          Seus dados são usados apenas para responder este orçamento. Nada de lista de e-mail, nada compartilhado com terceiros.
        </p>
        <button
          type="submit"
          disabled={enviando}
          className={cn(
            "group relative inline-flex min-h-12 shrink-0 items-center justify-center gap-2.5 rounded-full bg-ignite px-8 py-3.5 text-[0.95rem] font-semibold tracking-tight text-carbon-900 transition-all duration-200",
            enviando ? "cursor-wait opacity-70" : "hover:brightness-110 hover:shadow-[0_0_34px_-4px_rgba(255,87,34,0.7)]",
          )}
        >
          <AnimatePresence mode="wait" initial={false}>
            {enviando ? (
              <motion.span key="enviando" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2.5">
                <Loader2 size={17} className="animate-spin" />
                Enviando…
              </motion.span>
            ) : (
              <motion.span key="enviar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-2.5">
                Enviar solicitação
                <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-1" />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </form>
  );
}
