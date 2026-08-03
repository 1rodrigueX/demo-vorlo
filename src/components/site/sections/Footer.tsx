import { Logo } from "@/components/site/brand/Logo";
import { NAV } from "@/lib/site/content";

/** Rodapé do site público. */
export function Footer({ user }: { user: { name: string } | null }) {
  return (
    <footer className="relative border-t border-carbon-700 px-5 py-12 sm:px-8">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-9 sm:flex-row sm:items-end sm:justify-between">
        <a href="/" className="text-[1.4rem]" aria-label="SYNEXA — início">
          <Logo showTagline markMode="hover" />
        </a>

        <div className="flex flex-col gap-5 sm:items-end">
          <nav className="-my-3 flex flex-wrap gap-x-7">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="inline-flex items-center py-3 text-sm text-grey transition-colors hover:text-ignite"
              >
                {item.label}
              </a>
            ))}
            <a
              href={user ? "/central" : "/login?next=/"}
              className="inline-flex items-center py-3 text-sm text-grey transition-colors hover:text-ignite"
            >
              {user ? "Meus acessos" : "Fazer login"}
            </a>
          </nav>
          <p className="type-mono-label text-[0.68rem]">© {new Date().getFullYear()} SYNEXA · Soluções digitais</p>
        </div>
      </div>
    </footer>
  );
}
