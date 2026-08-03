"use client";

import { motion } from "motion/react";
import { FileSignature, CalendarCheck, ShieldCheck, Wrench } from "lucide-react";
import { Section } from "@/components/site/Section";
import { MagicCard } from "@/components/site/MagicCard";
import { NumberTicker } from "@/components/site/NumberTicker";
import { GUARANTEES, STATS } from "@/lib/site/content";

const ICONS = {
  contrato: FileSignature,
  prazo: CalendarCheck,
  seguranca: ShieldCheck,
  manutencao: Wrench,
} as const;

function GuaranteeCard({ item, index }: { item: (typeof GUARANTEES)[number]; index: number }) {
  const Icon = ICONS[item.id as keyof typeof ICONS];
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <MagicCard
        gradientSize={240}
        gradientColor="#1f1f1f"
        gradientOpacity={0.6}
        gradientFrom="#FF5722"
        gradientTo="#7A2410"
        className="h-full rounded-xl border border-carbon-700 bg-carbon-800"
      >
        <div className="flex h-full flex-col p-6 sm:p-7">
          <span className="mb-5 grid h-11 w-11 place-items-center rounded-lg border border-carbon-700 bg-carbon-900 text-ignite">
            <Icon size={19} strokeWidth={1.8} />
          </span>
          <h3 className="text-[1.05rem] font-bold tracking-tight text-white-soft">{item.title}</h3>
          <p className="mt-2.5 text-sm leading-relaxed text-grey">{item.body}</p>
        </div>
      </MagicCard>
    </motion.div>
  );
}

export function Credibility() {
  return (
    <Section
      id="garantias"
      eyebrow="Credibilidade"
      title={
        <>
          Compromissos <span className="text-ignite">por escrito</span>
        </>
      }
      intro="Fechar com uma agência não deveria exigir fé. Estes quatro pontos entram no contrato antes de qualquer pagamento."
    >
      <div className="mb-16 grid grid-cols-2 gap-x-6 gap-y-10 border-y border-carbon-700 py-10 lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="type-display flex items-baseline text-[clamp(2.1rem,5.5vw,3.2rem)] text-ignite">
              {"prefix" in stat && stat.prefix ? <span>{stat.prefix}</span> : null}
              <NumberTicker value={stat.value} decimalPlaces={stat.decimals} delay={0.15 + i * 0.1} className="type-display text-ignite" />
              {"suffix" in stat && stat.suffix ? <span className="text-[0.5em]">{stat.suffix}</span> : null}
            </p>
            <p className="type-mono-label mt-2.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {GUARANTEES.map((g, i) => (
          <GuaranteeCard key={g.id} item={g} index={i} />
        ))}
      </div>
    </Section>
  );
}
