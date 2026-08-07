"use client";

import { useFormStatus } from "react-dom";
import { loginWithGoogle } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.26v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.26A12 12 0 0 0 0 12c0 1.94.46 3.77 1.26 5.38l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.26 6.62l4.01 3.1c.95-2.85 3.6-4.97 6.73-4.97Z"
      />
    </svg>
  );
}

function GoogleSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" className="w-full" isLoading={pending}>
      {!pending && <GoogleIcon />}
      Continuar com Google
    </Button>
  );
}

/**
 * Login com Google via Auth.js. Um form que chama a server action loginWithGoogle
 * (que dispara o signIn do provider) — sem client SDK do Supabase.
 *
 * Só aparece quando o Google está configurado (NEXT_PUBLIC_GOOGLE_AUTH_ENABLED).
 * Assim dá pra subir "e-mail/senha por enquanto" sem um botão que não funciona;
 * ative o flag (+ AUTH_GOOGLE_ID/SECRET no servidor) quando for ligar o Google.
 */
export function GoogleAuthButton({ next }: { next?: string }) {
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "true") return null;

  return (
    <form action={loginWithGoogle}>
      {next && <input type="hidden" name="next" value={next} />}
      <GoogleSubmit />
    </form>
  );
}
