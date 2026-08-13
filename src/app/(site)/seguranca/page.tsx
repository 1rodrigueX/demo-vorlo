"use client";

import { motion } from "motion/react";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Globe,
  Database,
  KeyRound,
  ServerCog,
  HardDriveDownload,
  Scale,
  EyeOff,
} from "lucide-react";
import { CtaButton } from "@/components/site/CtaButton";
import { MagicCard } from "@/components/site/MagicCard";

const MEDIDAS = [
  {
    icon: Lock,
    titulo: "Criptografia em repouso",
    corpo:
      "Credenciais e chaves sensíveis são cifradas no banco com AES-256-GCM. Mesmo que os dados fossem acessados, ficam ilegíveis sem a chave-mestra — que nunca fica no código nem no banco.",
  },
  {
    icon: Globe,
    titulo: "Criptografia em trânsito",
    corpo:
      "Todo o tráfego é HTTPS/TLS, com HSTS forçando conexões seguras. Nada trafega em texto puro entre você e a plataforma.",
  },
  {
    icon: Database,
    titulo: "Isolamento por cliente",
    corpo:
      "Cada empresa só enxerga os próprios dados, garantido no nível do banco (Row-Level Security). Um cliente nunca acessa dados de outro — nem por engano.",
  },
  {
    icon: KeyRound,
    titulo: "Autenticação forte",
    corpo:
      "Autenticação em duas etapas (2FA/MFA), senhas protegidas por hash e sessões gerenciadas com segurança. Acesso só de quem realmente é você.",
  },
  {
    icon: ServerCog,
    titulo: "Aplicação blindada",
    corpo:
      "Content-Security-Policy, HSTS e cabeçalhos de segurança que barram scripts externos, clickjacking e injeção. Toda entrada é validada e todo conteúdo, sanitizado.",
  },
  {
    icon: HardDriveDownload,
    titulo: "Backups automáticos",
    corpo:
      "Rotinas de backup periódicas mantêm seus dados recuperáveis — proteção contra falha, erro humano ou incidente.",
  },
];

function Medida({
  icon: Icon,
  titulo,
  corpo,
  index,
}: {
  icon: typeof Lock;
  titulo: string;
  corpo: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <MagicCard
        gradientSize={260}
        gradientColor="#1f1f1f"
        gradientOpacity={0.6}
        gradientFrom="#FF5722"
        gradientTo="#7A2410"
        className="h-full rounded-xl border border-carbon-700 bg-carbon-800"
      >
        <div className="flex h-full flex-col p-6 sm:p-7">
          <span className="grid h-11 w-11 place-items-center rounded-lg border border-carbon-700 bg-carbon-900 text-ignite">
            <Icon size={20} strokeWidth={1.8} />
          </span>
          <h3 className="mt-5 type-display text-[1.15rem] leading-tight text-white-soft">{titulo}</h3>
          <p className="mt-3 text-sm leading-relaxed text-grey">{corpo}</p>
        </div>
      </MagicCard>
    </motion.div>
  );
}

export default function SegurancaPage() {
  return (
    <section className="relative min-h-[100svh] px-5 pb-28 pt-32 sm:px-8 sm:pt-40">
      <div className="mx-auto w-full max-w-[1240px]">
        <a
          href="/"
          className="mb-10 inline-flex min-h-11 items-center gap-2 text-sm text-grey transition-colors hover:text-ignite"
        >
          <ArrowLeft size={15} />
          Voltar para o início
        </a>

        <motion.header
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl"
        >
          <p className="type-eyebrow mb-4 inline-flex items-center gap-2">
            <ShieldCheck size={15} className="text-ignite" />
            Segurança
          </p>
          <h1 className="type-display text-[clamp(2.1rem,5.5vw,3.6rem)] text-white-soft text-balance">
            Seus dados <span className="text-ignite">protegidos</span> em cada camada
          </h1>
          <p className="mt-5 text-base leading-relaxed text-grey sm:text-lg">
            Segurança não é um recurso à parte — é como a plataforma é construída. Criptografia, isolamento por
            cliente, autenticação forte e conformidade com a LGPD fazem parte do produto desde o primeiro dia.
          </p>
        </motion.header>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MEDIDAS.map((m, i) => (
            <Medida key={m.titulo} {...m} index={i} />
          ))}
        </div>

        {/* Destaque — dados sigilosos */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 rounded-2xl border border-carbon-700 bg-carbon-800 p-8 sm:p-12"
        >
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className="type-eyebrow mb-4">Dados sigilosos</p>
              <h2 className="type-display text-[clamp(1.6rem,4vw,2.4rem)] text-white-soft">
                Cifrados de ponta a ponta, revelados só com autorização
              </h2>
              <p className="mt-5 leading-relaxed text-grey">
                Chaves de API, tokens e credenciais que a sua operação conecta ficam guardados{" "}
                <span className="text-white-soft">criptografados com AES-256-GCM</span>. A chave que decifra esses
                dados vive fora do banco e do código, protegida no servidor.
              </p>
              <p className="mt-4 leading-relaxed text-grey">
                No dia a dia, dados sensíveis aparecem <span className="text-white-soft">mascarados</span> na tela e
                só são revelados por quem tem permissão — reduzindo a exposição mesmo dentro da própria equipe.
              </p>
            </div>

            <div className="flex flex-col justify-center gap-3">
              {[
                { icon: Lock, texto: "AES-256-GCM (com verificação de integridade)" },
                { icon: KeyRound, texto: "Chave-mestra fora do banco e do repositório" },
                { icon: EyeOff, texto: "Campos sensíveis mascarados por padrão" },
                { icon: ServerCog, texto: "Acesso registrado e sob controle de permissão" },
              ].map((item) => (
                <div
                  key={item.texto}
                  className="flex items-center gap-3 rounded-xl border border-carbon-700 bg-carbon-900 px-4 py-3.5"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ignite/10 text-ignite">
                    <item.icon size={17} strokeWidth={1.9} />
                  </span>
                  <span className="text-sm text-white-soft">{item.texto}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* LGPD */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 flex flex-col gap-6 sm:flex-row sm:items-start"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-carbon-700 bg-carbon-800 text-ignite">
            <Scale size={22} strokeWidth={1.8} />
          </span>
          <div className="max-w-3xl">
            <h2 className="type-display text-[clamp(1.5rem,3.5vw,2.2rem)] text-white-soft">
              Alinhados à <span className="text-ignite">LGPD</span>
            </h2>
            <p className="mt-4 leading-relaxed text-grey">
              Trato dados pessoais seguindo a Lei Geral de Proteção de Dados: coleta com finalidade clara,
              respeito aos direitos do titular (acesso, correção e exclusão) e minimização — guardo só o que a
              operação do seu negócio precisa. Quer exercer um direito sobre seus dados? É só me chamar.
            </p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-24 flex flex-col items-start gap-6 border-t border-carbon-700 pt-14 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h2 className="type-display text-[clamp(1.5rem,3.5vw,2.2rem)] text-white-soft">
              Tem uma dúvida de segurança?
            </h2>
            <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-grey">
              Me pergunta como os dados da sua empresa ficam protegidos — respondo rápido.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <CtaButton href="/orcamento" className="shrink-0">
              Falar com a Vorlo
            </CtaButton>
            <CtaButton href="/produtos" variant="ghost" className="shrink-0">
              Ver os produtos
            </CtaButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
