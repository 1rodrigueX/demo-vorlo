import type { Metadata } from "next";
import { Montserrat, IBM_Plex_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/site/sections/Header";
import { Footer } from "@/components/site/sections/Footer";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "700", "800"], variable: "--font-montserrat" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex" });

export const metadata: Metadata = {
  title: { absolute: "SYNEXA · Soluções digitais — Sites, CRM & Automações" },
  description:
    "Sites, e-commerce, CRM e plataformas sob medida para empresas que precisam vender. Código próprio, prazo em contrato, suporte contínuo.",
};

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  const user = authUser
    ? { name: (authUser.user_metadata?.full_name as string | undefined) || authUser.email || "Minha conta" }
    : null;

  return (
    <div className={`syn-site ${montserrat.variable} ${plex.variable} min-h-screen bg-carbon-900 text-white-soft antialiased`}>
      <Header user={user} />
      <main className="relative z-10">{children}</main>
      <Footer user={user} />
    </div>
  );
}
