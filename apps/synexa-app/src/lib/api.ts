import { supabase } from "@/lib/supabase";

// Base da API fina do servidor (operações privilegiadas: enviar WhatsApp etc.).
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || "https://falaai.cloud";

/** POST autenticado com o JWT do usuário (Bearer). Lança Error com a mensagem do servidor. */
export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) throw new Error(json.error || `Erro ${res.status}`);
  return json;
}
