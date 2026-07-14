export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBaileysConnection } = await import("@/lib/whatsapp/baileysClient");
    await startBaileysConnection();
  }
}
