"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Menu, X, LogIn } from "lucide-react";
import { Logo } from "@/components/site/brand/Logo";
import { CtaButton } from "@/components/site/CtaButton";
import { NAV } from "@/lib/site/content";
import { cn } from "@/lib/utils/cn";

/** Header fixo do site: marca + nav + CTA. Ganha fundo após 24px de scroll. */
export function Header() {
  const pathname = usePathname();
  const naHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navItems = NAV.filter((item) => naHome || !item.href.startsWith("/#"));

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-carbon-700 bg-carbon-900/80 backdrop-blur-xl" : "border-b border-transparent",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <a
            href="/"
            aria-label="SYNEXA — início"
            className="group inline-flex min-h-11 items-center text-[1.15rem] sm:text-[1.3rem]"
          >
            <Logo compactBelow="sm" markMode="hover" />
          </a>
          <span className="hidden items-center gap-2 border-l border-carbon-700 pl-4 md:inline-flex">
            <span className="status-dot block h-2 w-2 rounded-full bg-ignite" />
            <span className="type-mono-label text-[0.68rem]">Disponível para projetos</span>
          </span>
        </div>

        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group relative text-sm font-medium text-grey transition-colors duration-200 hover:text-white-soft"
            >
              {item.label}
              <span className="absolute -bottom-1.5 left-0 block h-px w-full origin-left scale-x-0 bg-ignite transition-transform duration-300 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/login"
            className="hidden items-center gap-1.5 text-sm font-medium text-grey transition-colors hover:text-white-soft sm:inline-flex"
          >
            <LogIn size={15} />
            Entrar no CRM
          </a>
          <CtaButton href="/orcamento" pulse className="hidden px-5 py-2.5 text-[0.82rem] sm:inline-flex">
            Solicitar orçamento
          </CtaButton>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            aria-expanded={open}
            className="grid h-11 w-11 place-items-center rounded-full border border-carbon-700 text-white-soft transition-colors hover:border-ignite hover:text-ignite lg:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
        className="overflow-hidden border-t border-carbon-700 bg-carbon-900/95 backdrop-blur-xl lg:hidden"
      >
        <nav className="flex flex-col gap-1 px-5 py-5 sm:px-8">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-medium text-grey transition-colors hover:bg-carbon-800 hover:text-white-soft"
            >
              {item.label}
            </a>
          ))}
          <a
            href="/login"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-base font-medium text-grey transition-colors hover:bg-carbon-800 hover:text-white-soft"
          >
            Entrar no CRM
          </a>
          <CtaButton href="/orcamento" className="mt-3 w-full">
            Solicitar orçamento
          </CtaButton>
        </nav>
      </motion.div>
    </motion.header>
  );
}
