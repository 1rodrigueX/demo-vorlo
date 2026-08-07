"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { onRealtime } from "@/lib/realtime/client";

/**
 * Refreshes the inbox list (previews/ordering) on any new WhatsApp message,
 * across all conversations — unlike ContactRealtimeListener, which is
 * scoped to a single contact_id.
 */
export function WhatsAppListRealtimeListener() {
  const router = useRouter();

  useEffect(() => {
    return onRealtime((event) => {
      if (event.table === "whatsapp_messages") router.refresh();
    });
  }, [router]);

  return null;
}
