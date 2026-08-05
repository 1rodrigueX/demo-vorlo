import { createClient } from "@supabase/supabase-js";

// Cliente Supabase do app (browser/webview). A sessão é persistida localmente
// pelo próprio supabase-js — no Tauri isso vive no storage seguro da webview.
// A chave anon é pública por design (protegida por RLS no banco).
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "synexa-app-auth",
  },
});
