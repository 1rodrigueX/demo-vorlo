import { SuporteNavTabs } from "@/components/assistant/SuporteNavTabs";

export default function SuporteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col">
      <div className="mb-3">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Suporte</h1>
        <p className="mt-1 text-sm text-gray-500">Tire dúvidas, veja tutoriais e vídeos sobre o CRM.</p>
      </div>
      <SuporteNavTabs />
      <div className="mt-4 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
