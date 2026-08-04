import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemedToaster } from "@/components/layout/ThemedToaster";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Synexa",
  description: "CRM de vendas com assistente de IA",
};

// Aplica, ANTES do primeiro paint (síncrono e inline), o tema salvo e o Modo
// Lite — pra não ter flash. O Modo Lite (data-lite="1") tira efeitos visuais
// pesados; aceita ?lite=1/0 na URL (persiste) além do localStorage.
const bootScript = `(function(){try{
var t=localStorage.getItem('theme');
if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
document.documentElement.setAttribute('data-theme',t);
var p=new URLSearchParams(window.location.search),l=localStorage.getItem('lite');
if(p.get('lite')==='1'){l='1';localStorage.setItem('lite','1');}
else if(p.get('lite')==='0'){l='0';localStorage.setItem('lite','0');}
if(l==='1'){document.documentElement.setAttribute('data-lite','1');}
}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Abre a conexão com o Supabase cedo — corta o handshake da 1ª chamada. */}
        {supabaseUrl && <link rel="preconnect" href={supabaseUrl} crossOrigin="anonymous" />}
        {supabaseUrl && <link rel="dns-prefetch" href={supabaseUrl} />}
      </head>
      <body className="min-h-full flex flex-col bg-gray-50">
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        {children}
        <ThemedToaster />
      </body>
    </html>
  );
}
