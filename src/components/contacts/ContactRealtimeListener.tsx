"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to Realtime changes on this contact's activities (notes, calls,
 * follow-ups, stage changes) and refreshes the Server Component tree so the
 * general timeline updates live. WhatsApp messages have their own dedicated
 * realtime subscription inside WhatsAppChatPanel, so they're excluded here
 * to avoid double-refreshing the page on every inbound/outbound message.
 */
export function ContactRealtimeListener({ contactId }: { contactId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`contact-${contactId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activities", filter: `contact_id=eq.${contactId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { type?: string } | null;
          if (row?.type === "whatsapp") return;
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, router]);

  return null;
}
