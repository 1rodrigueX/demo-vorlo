import { MessageCircle, Camera, Users, Send, MessageSquare, Mail, Smartphone, type LucideIcon } from "lucide-react";

/**
 * Metadados dos canais omnichannel (fase 2c). A identidade de cada canal vem
 * da cor + nome (essa versão do lucide-react não traz ícones de marca do
 * WhatsApp/Instagram/Facebook, então usamos ícones genéricos + a cor oficial).
 */
export type ChannelKey = "whatsapp" | "instagram" | "facebook" | "telegram" | "messenger" | "email" | "sms";

export const CHANNEL_META: Record<ChannelKey, { label: string; icon: LucideIcon; color: string; gradient?: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "#25D366" },
  instagram: {
    label: "Instagram",
    icon: Camera,
    color: "#DD2A7B",
    gradient: "linear-gradient(135deg, #F58529 0%, #DD2A7B 45%, #8134AF 75%, #515BD4 100%)",
  },
  facebook: { label: "Facebook", icon: Users, color: "#1877F2" },
  telegram: { label: "Telegram", icon: Send, color: "#229ED9" },
  messenger: { label: "Messenger", icon: MessageSquare, color: "#0084FF" },
  email: { label: "Email", icon: Mail, color: "#6B7280" },
  sms: { label: "SMS", icon: Smartphone, color: "#9333EA" },
};

/** Ordem de exibição canônica dos canais no cabeçalho. */
export const CHANNEL_ORDER: ChannelKey[] = [
  "whatsapp",
  "instagram",
  "facebook",
  "telegram",
  "messenger",
  "email",
  "sms",
];
