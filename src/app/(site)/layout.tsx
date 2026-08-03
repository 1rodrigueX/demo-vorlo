import type { Metadata } from "next";
import { Montserrat, IBM_Plex_Mono } from "next/font/google";
import { Header } from "@/components/site/sections/Header";
import { Footer } from "@/components/site/sections/Footer";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "700", "800"], variable: "--font-montserrat" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex" });

export const metadata: Metadata = {
  title: "SYNEXA · Soluções digitais — Sites, CRM & Automações",
  description:
    "Sites, e-commerce, CRM e plataformas sob medida para empresas que precisam vender. Código próprio, prazo em contrato, suporte contínuo.",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`syn-site ${montserrat.variable} ${plex.variable} min-h-screen bg-carbon-900 text-white-soft antialiased`}>
      <Header />
      <main className="relative z-10">{children}</main>
      <Footer />
    </div>
  );
}
