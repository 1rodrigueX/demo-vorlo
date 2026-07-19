"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card } from "@/components/ui/Card";
import { enrollMfa, verifyMfaEnrollment, unenrollMfa } from "@/lib/actions/mfa";

type Factor = { id: string; friendly_name?: string | null };

export function MfaSettingsCard({ initialFactors }: { initialFactors: Factor[] }) {
  const [factors, setFactors] = useState(initialFactors);
  const [enrolling, setEnrolling] = useState<{ factorId: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  const isEnrolled = factors.length > 0;

  function handleStartEnroll() {
    startTransition(async () => {
      const result = await enrollMfa();
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setEnrolling(result);
    });
  }

  function handleConfirm() {
    if (!enrolling) return;
    startTransition(async () => {
      const result = await verifyMfaEnrollment(enrolling.factorId, code);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Autenticação em duas etapas ativada");
      setFactors([...factors, { id: enrolling.factorId }]);
      setEnrolling(null);
      setCode("");
    });
  }

  function handleCancelEnroll() {
    setEnrolling(null);
    setCode("");
  }

  function handleRemove(factorId: string) {
    if (!window.confirm("Desativar a autenticação em duas etapas? Sua conta fica só com senha de novo.")) return;
    startTransition(async () => {
      const result = await unenrollMfa(factorId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setFactors(factors.filter((f) => f.id !== factorId));
      toast.success("Autenticação em duas etapas desativada");
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            isEnrolled ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
          }`}
        >
          {isEnrolled ? <ShieldCheck size={20} /> : <ShieldOff size={20} />}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Autenticação em duas etapas</h3>
          <p className="text-xs text-gray-500">
            {isEnrolled ? "Ativada — um app autenticador é exigido no login." : "Desativada"}
          </p>
        </div>
      </div>

      {enrolling ? (
        <div className="mt-5 space-y-4">
          <p className="text-sm text-gray-600">
            Escaneie o QR com um app autenticador (Google Authenticator, Authy, 1Password etc.) e digite o código
            gerado pra confirmar.
          </p>
          <div
            className="mx-auto w-fit rounded-lg border border-gray-200 bg-white p-3"
            // eslint-disable-next-line react/no-danger -- SVG do QR vem direto do Supabase Auth, gerado no servidor, sem input do usuário
            dangerouslySetInnerHTML={{ __html: enrolling.qrCode }}
          />
          <p className="break-all text-center text-xs text-gray-400">
            Não consegue escanear? Digite manualmente: <span className="font-mono">{enrolling.secret}</span>
          </p>
          <div>
            <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
            <Input
              id="mfa-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleCancelEnroll} className="flex-1" type="button">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} isLoading={isPending} className="flex-1" type="button">
              Confirmar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          {isEnrolled ? (
            <Button
              variant="danger"
              size="sm"
              isLoading={isPending}
              onClick={() => handleRemove(factors[0].id)}
              type="button"
            >
              Desativar
            </Button>
          ) : (
            <Button size="sm" isLoading={isPending} onClick={handleStartEnroll} type="button">
              Ativar
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
