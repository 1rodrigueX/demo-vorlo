import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { VorloMark } from "@/components/VorloMark";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn(email.trim(), password);
    if (res.error) {
      setError("E-mail ou senha incorretos.");
      setBusy(false);
    }
    // Sucesso: o AuthProvider recebe a nova sessão e o App redireciona sozinho.
  };

  return (
    <div className="brand-aura grid h-full place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="text-ignite">
            <VorloMark size={46} />
          </span>
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-white-soft">Entrar na Vorlo</h1>
          <p className="mt-1.5 text-sm text-grey">Acesse seu CRM.</p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <Input
            type="email"
            required
            autoFocus
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            required
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" disabled={busy} className="mt-1 w-full py-3">
            {busy ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-grey-dim">Vorlo · app desktop</p>
      </div>
    </div>
  );
}
