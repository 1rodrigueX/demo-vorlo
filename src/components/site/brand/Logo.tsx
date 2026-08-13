import { cn } from "@/lib/utils/cn";
import { LogoMark } from "./LogoMark";

interface LogoProps {
  className?: string;
  variant?: "dark" | "light";
  compactBelow?: "sm" | "md" | "never";
  showTagline?: boolean;
  markMode?: "static" | "assemble" | "hover";
}

/** Logo composta: símbolo + wordmark VOR·LO (Montserrat 800). */
export function Logo({
  className,
  variant = "dark",
  compactBelow = "never",
  showTagline = false,
  markMode = "static",
}: LogoProps) {
  const wordTone = variant === "dark" ? "text-white-soft" : "text-carbon-900";
  const markTone = variant === "dark" ? "text-ignite" : "text-carbon-900";
  const taglineTone = variant === "dark" ? "text-grey" : "text-carbon-900/70";

  const wordmarkVisibility =
    compactBelow === "sm" ? "hidden sm:flex" : compactBelow === "md" ? "hidden md:flex" : "flex";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark mode={markMode} title="VORLO" className={cn("h-[1.65em] w-auto shrink-0", markTone)} />

      <span className={cn("flex-col leading-none", wordmarkVisibility)}>
        <span className={cn("type-display text-[1em] tracking-[-0.02em]", wordTone)}>
          VOR<span className="text-ignite">LO</span>
        </span>

        {showTagline ? (
          <span className={cn("mt-1.5 font-mono text-[0.3em] uppercase tracking-[0.28em]", taglineTone)}>
            Soluções digitais · Sites, CRM &amp; Automações
          </span>
        ) : null}
      </span>
    </span>
  );
}
