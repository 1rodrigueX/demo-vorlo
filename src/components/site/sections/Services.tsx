"use client";

import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Section } from "@/components/site/Section";
import { MagicCard } from "@/components/site/MagicCard";
import { SERVICES } from "@/lib/site/content";

function ServiceCard({ service, index }: { service: (typeof SERVICES)[number]; index: number }) {
  return (
    <motion.a
      href={service.href}
      initial={{ opacity: 0, y: 34 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] }}
      className="block h-full"
    >
      <MagicCard
        gradientSize={280}
        gradientColor="#1f1f1f"
        gradientOpacity={0.65}
        gradientFrom="#FF5722"
        gradientTo="#7A2410"
        className="h-full rounded-xl border border-carbon-700 bg-carbon-800"
      >
        <div className="flex h-full flex-col p-7 sm:p-8">
          <h3 className="type-display text-[1.45rem] leading-tight text-white-soft sm:text-[1.6rem]">
            {service.title}
          </h3>
          <p className="mt-4 flex-1 text-[0.95rem] leading-relaxed text-grey">{service.body}</p>
          <ul className="mt-6 space-y-2.5 border-t border-carbon-700 pt-6">
            {service.points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 font-mono text-xs tracking-wide text-grey">
                <span className="mt-[7px] block h-1 w-1 shrink-0 rounded-full bg-ignite" />
                {p}
              </li>
            ))}
          </ul>
          <span className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-ignite">
            {service.href === "/signup" ? "Criar conta" : "Solicitar proposta"}
            <ArrowUpRight
              size={15}
              className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </span>
        </div>
      </MagicCard>
    </motion.a>
  );
}

export function Services() {
  return (
    <Section
      id="servicos"
      eyebrow="Serviços"
      title={
        <>
          O que construímos para <span className="text-ignite">empresas</span>
        </>
      }
      intro="Quatro frentes, um critério: tem que dar retorno comercial. Nada é template adaptado — tudo é código escrito para o seu negócio."
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {SERVICES.map((s, i) => (
          <ServiceCard key={s.id} service={s} index={i} />
        ))}
      </div>
    </Section>
  );
}
