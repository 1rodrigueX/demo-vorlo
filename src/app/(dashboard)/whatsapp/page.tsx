import { MessageCircle } from "lucide-react";

export default function WhatsAppIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
      <MessageCircle size={40} />
      <p className="text-sm">Selecione uma conversa</p>
    </div>
  );
}
