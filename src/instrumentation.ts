export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBaileysConnection } = await import("@/lib/whatsapp/baileysClient");
    const { createAdminClient } = await import("@/lib/supabase/admin");

    const admin = createAdminClient();
    const { data: connections } = await admin
      .from("whatsapp_connections")
      .select("tenant_id")
      .eq("provider", "baileys");

    for (const connection of connections ?? []) {
      void startBaileysConnection(connection.tenant_id);
    }

    const { ensureDiscordGatewayConnected } = await import("@/lib/discord/gatewayClient");
    void ensureDiscordGatewayConnected();
  }
}
